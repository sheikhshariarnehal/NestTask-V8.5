import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppLifecycle } from './useAppLifecycle';

export interface SupabaseLifecycleOptions {
  onSessionExpired?: () => void;
  onSessionRefreshed?: () => void;
  onAuthError?: (error: Error) => void;
  enabled?: boolean;
}

/**
 * Hook to manage Supabase session lifecycle:
 * - Validates session on app resume
 * - Refreshes expired sessions automatically
 * - Prevents silent RLS failures due to invalid tokens
 * - Handles auth errors gracefully
 */
export function useSupabaseLifecycle(options: SupabaseLifecycleOptions = {}) {
  const { enabled = true, onSessionExpired, onSessionRefreshed, onAuthError } = options;
  const isValidatingRef = useRef(false);
  const lastValidationRef = useRef<number>(Date.now());
  const optionsRef = useRef(options);
  const isAutoRefreshEnabledRef = useRef<boolean>(false);

  // Update options ref when they change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  /**
   * Validates and refreshes the current session if needed
   */
  const validateSession = useCallback(async (force = false) => {
    if (!enabled) return true;

    // Prevent concurrent validations
    if (isValidatingRef.current && !force) {
      console.log('[Supabase Lifecycle] Validation already in progress');
      return true;
    }

    // Don't validate too frequently (throttle to once per 5 seconds unless forced)
    const now = Date.now();
    const timeSinceLastValidation = now - lastValidationRef.current;
    if (!force && timeSinceLastValidation < 5000) {
      console.log('[Supabase Lifecycle] Validation throttled');
      return true;
    }

    isValidatingRef.current = true;
    lastValidationRef.current = now;

    try {
      console.log('[Supabase Lifecycle] Validating session...');

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[Supabase Lifecycle] Error getting session:', sessionError.message);
        optionsRef.current.onAuthError?.(sessionError);
        return false;
      }

      if (!session) {
        console.log('[Supabase Lifecycle] No active session found');
        return true; // No session is not an error state
      }

      // Check if session is expired or about to expire (within 5 minutes)
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expiryTime = expiresAt * 1000; // Convert to milliseconds
        const timeUntilExpiry = expiryTime - now;
        const fiveMinutes = 5 * 60 * 1000;

        if (timeUntilExpiry <= 0) {
          console.log('[Supabase Lifecycle] Session expired, refreshing...');
          
          // Session is expired, try to refresh
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError) {
            console.error('[Supabase Lifecycle] Failed to refresh expired session:', refreshError.message);
            optionsRef.current.onSessionExpired?.();
            optionsRef.current.onAuthError?.(refreshError);
            return false;
          }

          if (refreshData.session) {
            console.log('[Supabase Lifecycle] Session refreshed successfully');
            optionsRef.current.onSessionRefreshed?.();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('supabase-session-refreshed'));
            }
            return true;
          } else {
            console.warn('[Supabase Lifecycle] Session refresh returned no session');
            optionsRef.current.onSessionExpired?.();
            return false;
          }
        } else if (timeUntilExpiry < fiveMinutes) {
          // Session will expire soon, proactively refresh
          console.log(`[Supabase Lifecycle] Session expires in ${Math.round(timeUntilExpiry / 1000)}s, proactively refreshing...`);
          
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError) {
            console.warn('[Supabase Lifecycle] Proactive refresh failed:', refreshError.message);
            // Not critical since session hasn't expired yet
            return true;
          }

          if (refreshData.session) {
            console.log('[Supabase Lifecycle] Session proactively refreshed');
            optionsRef.current.onSessionRefreshed?.();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('supabase-session-refreshed'));
            }
            return true;
          }
        } else {
          console.log(`[Supabase Lifecycle] Session valid for ${Math.round(timeUntilExpiry / 60000)} minutes`);
          return true;
        }
      }

      // Emit success event for coordination with data fetching
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-session-validated', { 
          detail: { success: true } 
        }));
      }
      
      return true;
    } catch (error: any) {
      console.error('[Supabase Lifecycle] Unexpected error during session validation:', error);
      
      // Emit failure event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('supabase-session-validated', { 
          detail: { success: false, error } 
        }));
      }
      
      optionsRef.current.onAuthError?.(error);
      return false;
    } finally {
      isValidatingRef.current = false;
    }
  }, [enabled]);

  /**
   * Handle app resume - validate and refresh session
   */
  const handleResume = useCallback(async () => {
    console.log('[Supabase Lifecycle] App resumed, validating session...');

    // Restart auto-refresh with retry logic for reliability
    let autoRefreshStarted = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await supabase.auth.startAutoRefresh();
        isAutoRefreshEnabledRef.current = true;
        autoRefreshStarted = true;
        console.log('[Supabase Lifecycle] Auto-refresh restarted successfully');
        break;
      } catch (e: any) {
        console.warn(`[Supabase Lifecycle] Auto-refresh restart attempt ${attempt + 1} failed:`, e?.message);
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    }
    
    if (!autoRefreshStarted) {
      console.error('[Supabase Lifecycle] Failed to restart auto-refresh after 3 attempts');
    }

    // Validate session (this will also refresh if needed)
    const isValid = await validateSession(true);
    
    if (!isValid) {
      console.error('[Supabase Lifecycle] Session validation failed on resume');
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('supabase-resume'));
    }
  }, [validateSession]);

  // Use app lifecycle hook to trigger session validation on resume
  useAppLifecycle({
    onResume: handleResume,
    onVisibilityChange: (isVisible) => {
      if (isVisible) {
        // Validate session when tab becomes visible
        validateSession(false);
      }
    },
    onNetworkChange: (isOnline) => {
      if (isOnline) {
        // Validate session when network reconnects
        validateSession(false);
      }
    },
    onAppStateChange: async (isActive) => {
      if (!enabled) return;

      // Stop auto-refresh in background to avoid unnecessary work.
      if (!isActive) {
        try {
          await supabase.auth.stopAutoRefresh();
          isAutoRefreshEnabledRef.current = false;
        } catch (e) {
          // ignore
        }
      }
    }
  });

  // Validate session on mount
  useEffect(() => {
    if (enabled) {
      validateSession(true);
    }
  }, [enabled, validateSession]);

  // Listen for validation requests from data hooks
  useEffect(() => {
    const handleValidationRequest = () => {
      console.log('[Supabase Lifecycle] Validation requested by data hook');
      validateSession(true);
    };
    
    window.addEventListener('request-session-validation', handleValidationRequest);
    
    return () => {
      window.removeEventListener('request-session-validation', handleValidationRequest);
    };
  }, [validateSession]);

  return {
    validateSession
  };
}
