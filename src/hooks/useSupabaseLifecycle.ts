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

  const emitSessionValidated = useCallback((detail: { success: boolean; error?: unknown }) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('supabase-session-validated', { detail }));
  }, []);

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
    // If validation is already in progress, just wait for it to finish (emitSessionValidated will be called by the original request)
    // This allows force=true requests to piggyback on existing in-flight validations rather than creating race conditions
    if (isValidatingRef.current) {
      console.log(`[Supabase Lifecycle] Validation already in progress${force ? ' (joining)' : ''}`);
      // return true to signal "request accepted", but the actual readiness will be signaled via event
      // If we are simulating an immediate return for "await validateSession()", we might be returning early,
      // but callers who care about correctness should be listening to the event or relying on the state change.
      // For tasks/UI waiting on "validateSession()", returning true here assumes "it will be valid soon".
      // A better approach for the caller is to wait for the event if they really need strictness.
      return true;
    }

    // Don't validate too frequently (throttle to once per 5 seconds unless forced)
    const now = Date.now();
    const timeSinceLastValidation = now - lastValidationRef.current;
    if (!force && timeSinceLastValidation < 5000) {
      console.log('[Supabase Lifecycle] Validation throttled');
      emitSessionValidated({ success: true });
      return true;
    }

    isValidatingRef.current = true;
    lastValidationRef.current = now;

    try {
      console.log('[Supabase Lifecycle] Validating session...');

      // Get current session with a timeout to prevent hanging
      // Supabase getSession can hang indefinitely on some Android environments/WebViews
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise<{
        data: { session: any };
        error: any;
      }>((resolve) => setTimeout(() => resolve({ 
        data: { session: null }, 
        error: { message: 'Session retrieval timed out' } 
      }), 4000));

      const { data: { session }, error: sessionError } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]);

      if (sessionError) {
        if (sessionError.message === 'Session retrieval timed out') {
           console.warn('[Supabase Lifecycle] Session check timed out - assuming offline or storage locked');
           // If we time out, we shouldn't necessarily fail validation if we think we might be logged in.
           // But returning false is safer than pretending we are verified.
           // However, blocking the app is bad.
           // Emitting success: false allows the app to redirect to login or show error.
        } else {
           console.error('[Supabase Lifecycle] Error getting session:', sessionError.message);
        }
        optionsRef.current.onAuthError?.(sessionError);
        emitSessionValidated({ success: false, error: sessionError });
        return false;
      }

      if (!session) {
        console.log('[Supabase Lifecycle] No active session found');
        emitSessionValidated({ success: true });
        return true; // No session is not an error state
      }

      // Check if session is expired or about to expire (within 5 minutes)
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const expiryTime = expiresAt * 1000; // Convert to milliseconds
        const timeUntilExpiry = expiryTime - now;
        const fiveMinutes = 5 * 60 * 1000;
        
        // On resume (force=true), we are more aggressive with refreshing to ensure fresh token
        // If less than 45 minutes remaining (token > 15 mins old), force refresh
        // This fixes the "zombie" state after long inactivity
        const aggressiveRefreshThreshold = 45 * 60 * 1000;
        const shouldForceRefresh = force && timeUntilExpiry < aggressiveRefreshThreshold;

        if (timeUntilExpiry <= 0 || shouldForceRefresh) {
          console.log(`[Supabase Lifecycle] Session ${timeUntilExpiry <= 0 ? 'expired' : 'stale on resume'}, refreshing...`);
          
          // Session is expired, try to refresh
          // Add retry logic for refresh specifically
          let refreshData = null;
          let refreshError = null;
          let attempts = 0;
          
          for (let i = 0; i < 3; i++) {
            attempts++;
             // Check network status before attempting refresh
            if (!navigator.onLine) {
                 console.log(`[Supabase Lifecycle] Offline, waiting 1s (attempt ${i+1})...`);
                 await new Promise(r => setTimeout(r, 1000));
                 continue;
            }

            try {
                // Add explicit timeout to refreshSession to prevent hanging indefinitely
                const refreshPromise = supabase.auth.refreshSession();
                const timeoutPromise = new Promise<{ data: { session: any }, error: any }>((resolve) => 
                    setTimeout(() => resolve({ 
                        data: { session: null }, 
                        error: new Error('Refresh request timed out') 
                    }), 10000) // 10s timeout
                );
                
                const res = await Promise.race([refreshPromise, timeoutPromise]);

                if (res.error) throw res.error;
                refreshData = res.data;
                refreshError = null;
                break;
            } catch (err: any) {
                console.warn(`[Supabase Lifecycle] Refresh attempt ${i + 1} failed:`, err.message);
                refreshError = err;
                
                // If it's a clear auth error (not network), stop retrying immediately
                // invalid_grant usually means refresh token is revoked/expired
                if (err?.code === 'invalid_grant' || err?.message?.includes('Invalid Refresh Token')) {
                   break;
                }
                
                await new Promise(r => setTimeout(r, 1500 * (i + 1))); // Linear backoff
            }
          }

          if (refreshError) {
             const errorMessage = refreshError.message?.toLowerCase() || '';
             const isRefInvalid = refreshError.code === 'invalid_grant' || errorMessage.includes('invalid refresh token');
             const isNetError = errorMessage.includes('network') || 
                                errorMessage.includes('fetch') ||
                                errorMessage.includes('timeout') ||
                                errorMessage.includes('timed out') ||
                                errorMessage.includes('connection') ||
                                errorMessage.includes('load failed');

             if (isRefInvalid) {
                console.error('[Supabase Lifecycle] Refresh token invalid, session expired:', refreshError.message);
                optionsRef.current.onSessionExpired?.();
                optionsRef.current.onAuthError?.(refreshError);
                emitSessionValidated({ success: false, error: refreshError });
                return false;
             } 
             
             if (isNetError || !navigator.onLine) {
                console.warn('[Supabase Lifecycle] Network error during refresh, keeping local session:', refreshError.message);
                // Don't kill the session, just warn. The app might work offline.
                // We emit success=true so the app doesn't hang, but we also fire onAuthError just in case
                // Actually, for "zombie" state, we want to allow the app to try to render
                emitSessionValidated({ success: true });
                return true; 
             }
             
            console.error('[Supabase Lifecycle] Failed to refresh expired session after retries:', refreshError.message);
            optionsRef.current.onSessionExpired?.();
            optionsRef.current.onAuthError?.(refreshError);
            emitSessionValidated({ success: false, error: refreshError });
            return false;
          }

          if (refreshData.session) {
            console.log('[Supabase Lifecycle] Session refreshed successfully');
            optionsRef.current.onSessionRefreshed?.();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('supabase-session-refreshed'));
            }
            emitSessionValidated({ success: true });
            return true;
          } else {
            console.warn('[Supabase Lifecycle] Session refresh returned no session');
            optionsRef.current.onSessionExpired?.();
            emitSessionValidated({ success: false, error: new Error('Session refresh returned no session') });
            return false;
          }
        } else if (timeUntilExpiry < fiveMinutes) {
          // Session will expire soon, proactively refresh
          console.log(`[Supabase Lifecycle] Session expires in ${Math.round(timeUntilExpiry / 1000)}s, proactively refreshing...`);
          
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

          if (refreshError) {
            console.warn('[Supabase Lifecycle] Proactive refresh failed:', refreshError.message);
            // Not critical since session hasn't expired yet
            emitSessionValidated({ success: true });
            return true;
          }

          if (refreshData.session) {
            console.log('[Supabase Lifecycle] Session proactively refreshed');
            optionsRef.current.onSessionRefreshed?.();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('supabase-session-refreshed'));
            }
            emitSessionValidated({ success: true });
            return true;
          }
        } else {
          console.log(`[Supabase Lifecycle] Session valid for ${Math.round(timeUntilExpiry / 60000)} minutes`);
          emitSessionValidated({ success: true });
          return true;
        }
      }

      // No expires_at available (rare) - treat as validated.
      emitSessionValidated({ success: true });
      
      return true;
    } catch (error: any) {
      console.error('[Supabase Lifecycle] Unexpected error during session validation:', error);

      emitSessionValidated({ success: false, error });
      
      optionsRef.current.onAuthError?.(error);
      return false;
    } finally {
      isValidatingRef.current = false;
    }
  }, [enabled, emitSessionValidated]);

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
