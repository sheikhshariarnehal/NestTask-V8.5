import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';

interface SessionReadyContextType {
  isSessionReady: boolean;
  isValidating: boolean;
  forceRefresh: () => Promise<void>;
}

const SessionReadyContext = createContext<SessionReadyContextType>({
  isSessionReady: false,
  isValidating: true,
  forceRefresh: async () => {},
});

export const useSessionReady = () => useContext(SessionReadyContext);

/**
 * SessionReadyProvider - Ensures session is validated before data fetching
 * 
 * This solves the cold start issue where:
 * 1. App opens after being closed for a long time
 * 2. Session in localStorage is expired
 * 3. Data fetching starts with expired token
 * 4. RLS silently rejects requests → empty data → stuck loading screen
 * 
 * Solution: Validate and refresh session BEFORE allowing any data fetching
 */
export function SessionReadyProvider({ children }: { children: React.ReactNode }) {
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const validationInProgress = useRef(false);
  const lastValidationTime = useRef(0);
  const mountedRef = useRef(true);

  const validateAndRefreshSession = useCallback(async (force = false) => {
    // Prevent concurrent validations
    if (validationInProgress.current && !force) {
      console.log('[SessionReady] Validation already in progress, skipping');
      return;
    }

    // Throttle validations (min 3 seconds apart unless forced)
    const now = Date.now();
    if (!force && now - lastValidationTime.current < 3000) {
      console.log('[SessionReady] Throttled, skipping validation');
      return;
    }

    validationInProgress.current = true;
    lastValidationTime.current = now;
    
    if (mountedRef.current) {
      setIsValidating(true);
    }
    
    try {
      console.log('[SessionReady] Starting session validation...');
      
      // Step 1: Get current session from storage
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[SessionReady] Error getting session:', sessionError);
        if (mountedRef.current) {
          setIsSessionReady(false);
        }
        return;
      }

      if (!session) {
        console.log('[SessionReady] No session found - user not logged in');
        if (mountedRef.current) {
          setIsSessionReady(false);
        }
        return;
      }

      // Step 2: Check if token is expired or close to expiry (within 5 min)
      const expiresAt = session.expires_at ?? 0;
      const nowSeconds = Math.floor(Date.now() / 1000);
      const bufferSeconds = 5 * 60; // 5 minutes buffer
      const isExpiredOrExpiring = expiresAt - nowSeconds < bufferSeconds;

      if (isExpiredOrExpiring) {
        console.log('[SessionReady] Session expired/expiring, refreshing token...');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[SessionReady] Failed to refresh session:', refreshError);
          // Session refresh failed - user needs to re-login
          if (mountedRef.current) {
            setIsSessionReady(false);
          }
          return;
        }

        if (!refreshData.session) {
          console.log('[SessionReady] No session after refresh');
          if (mountedRef.current) {
            setIsSessionReady(false);
          }
          return;
        }
        
        console.log('[SessionReady] Session refreshed successfully');
      }

      // Step 3: Validate token with server using getUser()
      // This is the ONLY reliable way to validate a session per Supabase docs
      // getSession() only reads from cache, getUser() makes a network call
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('[SessionReady] Token validation failed:', userError.message);
        
        // If token is invalid, try one refresh attempt
        if (userError.message.includes('token') || 
            userError.message.includes('JWT') ||
            userError.message.includes('expired') ||
            (userError as any).status === 401) {
          console.log('[SessionReady] Attempting token refresh after validation failure...');
          const { data: retryData, error: retryError } = await supabase.auth.refreshSession();
          
          if (retryError || !retryData.session) {
            console.error('[SessionReady] Refresh retry failed');
            if (mountedRef.current) {
              setIsSessionReady(false);
            }
            return;
          }
          
          // Verify the new session works
          const { data: { user: verifiedUser }, error: verifyError } = await supabase.auth.getUser();
          if (verifyError || !verifiedUser) {
            console.error('[SessionReady] Verification after refresh failed');
            if (mountedRef.current) {
              setIsSessionReady(false);
            }
            return;
          }
          
          console.log('[SessionReady] ✓ Session recovered after refresh');
        } else {
          if (mountedRef.current) {
            setIsSessionReady(false);
          }
          return;
        }
      }

      if (!user) {
        console.log('[SessionReady] No user returned from validation');
        if (mountedRef.current) {
          setIsSessionReady(false);
        }
        return;
      }

      console.log('[SessionReady] ✓ Session validated and ready for user:', user.id);
      if (mountedRef.current) {
        setIsSessionReady(true);
      }
      
      // Dispatch event for other components that might be listening
      window.dispatchEvent(new CustomEvent('session-ready', { detail: { userId: user.id } }));
      
    } catch (error) {
      console.error('[SessionReady] Unexpected validation error:', error);
      if (mountedRef.current) {
        setIsSessionReady(false);
      }
    } finally {
      if (mountedRef.current) {
        setIsValidating(false);
      }
      validationInProgress.current = false;
    }
  }, []);

  const forceRefresh = useCallback(async () => {
    console.log('[SessionReady] Force refresh requested');
    if (mountedRef.current) {
      setIsSessionReady(false);
    }
    await validateAndRefreshSession(true);
  }, [validateAndRefreshSession]);

  // Validate on mount (handles cold start)
  useEffect(() => {
    mountedRef.current = true;
    console.log('[SessionReady] Initial mount validation');
    validateAndRefreshSession(true);
    
    return () => {
      mountedRef.current = false;
    };
  }, [validateAndRefreshSession]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[SessionReady] Auth state changed:', event);
        
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            // Validate the new session
            await validateAndRefreshSession(true);
            break;
          case 'SIGNED_OUT':
            if (mountedRef.current) {
              setIsSessionReady(false);
              setIsValidating(false);
            }
            break;
          case 'INITIAL_SESSION':
            // This fires on page load, validate the session
            if (session) {
              await validateAndRefreshSession(true);
            } else {
              if (mountedRef.current) {
                setIsSessionReady(false);
                setIsValidating(false);
              }
            }
            break;
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [validateAndRefreshSession]);

  // Handle app resume (visibility change) - critical for mobile/Capacitor
  useEffect(() => {
    let lastVisibilityTime = Date.now();
    
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const hiddenDuration = Date.now() - lastVisibilityTime;
        console.log(`[SessionReady] App became visible after ${Math.round(hiddenDuration / 1000)}s`);
        
        // Only revalidate if hidden for more than 30 seconds
        if (hiddenDuration > 30000) {
          await validateAndRefreshSession(true);
        } else {
          await validateAndRefreshSession(false);
        }
      } else {
        lastVisibilityTime = Date.now();
      }
    };

    // Handle Capacitor app state changes
    const handleAppResume = async () => {
      console.log('[SessionReady] App resume event received');
      await validateAndRefreshSession(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('app-resume', handleAppResume);
    
    // For Capacitor native platforms, also listen for capacitor-specific events
    if (Capacitor.isNativePlatform()) {
      window.addEventListener('capacitor-app-state-change', ((event: CustomEvent) => {
        if (event.detail?.isActive) {
          console.log('[SessionReady] Capacitor app resumed');
          validateAndRefreshSession(true);
        }
      }) as EventListener);
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('app-resume', handleAppResume);
    };
  }, [validateAndRefreshSession]);

  return (
    <SessionReadyContext.Provider value={{ isSessionReady, isValidating, forceRefresh }}>
      {children}
    </SessionReadyContext.Provider>
  );
}
