import { useEffect, useCallback, useRef } from 'react';
import { supabase, getSessionSafe, wasInactiveForExtendedPeriod, checkSessionExpirySynchronous } from '../lib/supabase';
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
  const lastSuccessRef = useRef<number>(0); // Timestamp of last successful validation
  const optionsRef = useRef(options);
  const isAutoRefreshEnabledRef = useRef<boolean>(false);
  const httpRefreshSucceededRef = useRef<number>(0); // Timestamp of last successful HTTP refresh

  const emitSessionValidated = useCallback((detail: { success: boolean; error?: unknown }) => {
    if (typeof window === 'undefined') return;
    if (detail.success) {
      lastSuccessRef.current = Date.now();
    }
    console.log(`[Supabase Lifecycle] Emitting session-validated event: success=${detail.success}, error=${detail.error ? 'yes' : 'no'}`);
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

    const now = Date.now();
    console.log(`[Supabase Lifecycle] validateSession called (force=${force}, timestamp=${now})`);

    // Check if validation succeeded recently (within 1 second) - reduced for faster cold start
    const timeSinceSuccess = now - lastSuccessRef.current;
    if (timeSinceSuccess < 1000) {
      console.log(`[Supabase Lifecycle] Using cached validation (${timeSinceSuccess}ms ago) - emitting immediate success`);
      emitSessionValidated({ success: true });
      return true;
    }

    // Prevent concurrent validations
    // If validation is already in progress, just wait for it to finish (emitSessionValidated will be called by the original request)
    // This allows force=true requests to piggyback on existing in-flight validations rather than creating race conditions
    if (isValidatingRef.current) {
      console.log(`[Supabase Lifecycle] Validation already in progress${force ? ' (joining)' : ''} - hook will wait for event`);
      console.log(`[Supabase Lifecycle] HTTP refresh timestamp: ${httpRefreshSucceededRef.current}, now: ${now}`);
      // return true to signal "request accepted", but the actual readiness will be signaled via event
      // If we are simulating an immediate return for "await validateSession()", we might be returning early,
      // but callers who care about correctness should be listening to the event or relying on the state change.
      // For tasks/UI waiting on "validateSession()", returning true here assumes "it will be valid soon".
      // A better approach for the caller is to wait for the event if they really need strictness.
      return true;
    }

    // Don't validate too frequently (throttle to once per 5 seconds unless forced)
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

      // CRITICAL FIX: Check session expiry SYNCHRONOUSLY first to avoid 8-10s timeout
      // This reads directly from localStorage without any async localStorage access
      // On PWA cold start, async getSession() can timeout for 8-10 seconds
      const { needsRefresh, isExpired, session: storedSession } = checkSessionExpirySynchronous();
      
      // If session doesn't need refresh, skip async calls entirely!
      // OPTIMIZATION: If session is valid, cache immediately and skip all async work
      if (storedSession && !needsRefresh) {
        console.log('[Supabase Lifecycle] ⚡ Session valid (synchronous check), no refresh needed');
        lastSuccessRef.current = now; // Cache BEFORE emitting event
        emitSessionValidated({ success: true });
        return true;
      }
      
      // OPTIMIZATION: Early bailout if no session - skip ALL async work
      if (!storedSession) {
        console.log('[Supabase Lifecycle] No session found (synchronous check) - fast bailout');
        emitSessionValidated({ success: true });
        lastSuccessRef.current = now; // Cache the result
        return true; // No session is not an error state
      }

      // Session needs refresh - now we can afford the async call
      console.log(`[Supabase Lifecycle] Session needs refresh (expired: ${isExpired}), calling async refresh...`);
      
      // Check if HTTP refresh already succeeded recently (within last 5 seconds)
      const timeSinceHttpRefresh = now - httpRefreshSucceededRef.current;
      if (timeSinceHttpRefresh < 5000) {
        console.log(`[Supabase Lifecycle] HTTP refresh already succeeded ${timeSinceHttpRefresh}ms ago, skipping`);
        emitSessionValidated({ success: true });
        lastSuccessRef.current = now;
        return true;
      }

      // Attempt refresh with retry
      const expiresAt = storedSession.expires_at;
      const timeUntilExpiry = expiresAt ? (expiresAt * 1000 - now) : 0;
      const fiveMinutes = 5 * 60 * 1000;
      
      // On resume (force=true), we are more aggressive with refreshing to ensure fresh token
      // If less than 45 minutes remaining (token > 15 mins old), force refresh
      // This fixes the "zombie" state after long inactivity
      const aggressiveRefreshThreshold = 45 * 60 * 1000;
      const wasExtendedInactive = wasInactiveForExtendedPeriod();
      const shouldForceRefresh = force && (timeUntilExpiry < aggressiveRefreshThreshold || wasExtendedInactive);

      if (timeUntilExpiry <= 0 || shouldForceRefresh) {
        console.log(`[Supabase Lifecycle] Session ${timeUntilExpiry <= 0 ? 'expired' : 'stale on resume'} (inactive: ${wasExtendedInactive})`);
        console.log('[Supabase Lifecycle] Skipping SDK refresh - relying on HTTP bypass for reliability');
        
        // IMPORTANT: Skip SDK refresh entirely - it times out on Android WebView
        // The HTTP bypass (getSessionSafe) will handle refresh if needed
        // Just emit success and let the app proceed - HTTP bypass will kick in if session is truly invalid
        emitSessionValidated({ success: true });
        return true;
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

    // Note: autoRefreshToken is disabled in client config
    // Session refresh is handled by HTTP bypass + manual validation

    // Validate session (HTTP bypass will handle refresh if needed)
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

      // Note: autoRefreshToken is disabled in client config
      // No need to stop/start auto-refresh
      if (!isActive) {
        console.log('[Supabase Lifecycle] App backgrounded (auto-refresh disabled)');
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
    
    // Listen for HTTP refresh success events to skip SDK refresh
    const handleSessionRecovered = (e: Event) => {
      console.log('[Supabase Lifecycle] *** session-recovered event RECEIVED ***');
      const customEvent = e as CustomEvent;
      const timestamp = customEvent.detail?.timestamp || Date.now();
      const wasValidating = isValidatingRef.current;
      httpRefreshSucceededRef.current = timestamp;
      console.log(`[Supabase Lifecycle] HTTP refresh succeeded at ${timestamp}`);
      console.log(`[Supabase Lifecycle] Was validating: ${wasValidating}, releasing lock and emitting success`);
      isValidatingRef.current = false; // Release lock so next validation can proceed
      optionsRef.current.onSessionRefreshed?.();
      // CRITICAL: Emit validation success event so hooks waiting on SDK validation can proceed
      console.log('[Supabase Lifecycle] Emitting validation success event for waiting hooks');
      emitSessionValidated({ success: true });
      console.log('[Supabase Lifecycle] Validation success event emitted');
    };
    
    window.addEventListener('request-session-validation', handleValidationRequest);
    window.addEventListener('supabase-session-recovered', handleSessionRecovered);
    console.log('[Supabase Lifecycle] Event listeners attached (validation request & session recovered)');
    
    return () => {
      console.log('[Supabase Lifecycle] Removing event listeners');
      window.removeEventListener('request-session-validation', handleValidationRequest);
      window.removeEventListener('supabase-session-recovered', handleSessionRecovered);
    };
  }, [validateSession]);

  return {
    validateSession
  };
}
