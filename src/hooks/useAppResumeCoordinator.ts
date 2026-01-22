import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Global state for resume coordination (singleton pattern)
 */
let isResuming = false;
let lastResumeTime = 0;
const RESUME_DEBOUNCE_MS = 3000; // 3 seconds between resumes

/**
 * Centralized app resume coordinator
 * 
 * This hook handles ALL app resume operations in the correct order:
 * 1. Validate/refresh session
 * 2. Clean up stale realtime channels
 * 3. Notify data hooks to refresh
 * 
 * Other hooks should listen to 'app-resume-ready' instead of 'app-resume'
 */
export function useAppResumeCoordinator() {
  const isInitializedRef = useRef(false);

  const handleResume = useCallback(async () => {
    const now = Date.now();

    // Debounce: ignore resumes within 3 seconds
    if (now - lastResumeTime < RESUME_DEBOUNCE_MS) {
      console.log('[ResumeCoordinator] Debouncing - too soon');
      return;
    }

    // Prevent concurrent resume operations
    if (isResuming) {
      console.log('[ResumeCoordinator] Already resuming, skipping');
      return;
    }

    isResuming = true;
    lastResumeTime = now;
    console.log('[ResumeCoordinator] Starting resume sequence...');

    try {
      // Step 1: Validate session
      console.log('[ResumeCoordinator] Step 1: Validating session');
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[ResumeCoordinator] Session error:', error.message);
        window.dispatchEvent(new CustomEvent('app-session-error'));
        return;
      }

      if (!session) {
        console.log('[ResumeCoordinator] No session - user logged out');
        window.dispatchEvent(new CustomEvent('app-session-lost'));
        return;
      }

      // Check if session needs refresh (expires in < 5 min)
      const expiresAt = session.expires_at;
      if (expiresAt) {
        const timeUntilExpiry = (expiresAt * 1000) - now;
        if (timeUntilExpiry < 5 * 60 * 1000) {
          console.log('[ResumeCoordinator] Session expiring soon, refreshing...');
          await supabase.auth.refreshSession();
        }
      }

      // Restart auto-refresh
      try {
        await supabase.auth.startAutoRefresh();
      } catch (e) {
        console.warn('[ResumeCoordinator] Auto-refresh restart failed');
      }

      // Step 2: Clean up stale realtime channels
      console.log('[ResumeCoordinator] Step 2: Cleaning channels');
      const channels = supabase.getChannels();
      for (const channel of channels) {
        try {
          await supabase.removeChannel(channel);
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      // Small delay for cleanup to complete
      await new Promise(r => setTimeout(r, 100));

      // Step 3: Notify data hooks
      console.log('[ResumeCoordinator] Step 3: Notifying hooks');
      window.dispatchEvent(new CustomEvent('app-resume-ready', {
        detail: { userId: session.user.id }
      }));

      console.log('[ResumeCoordinator] Resume complete');
    } catch (err) {
      console.error('[ResumeCoordinator] Resume failed:', err);
    } finally {
      isResuming = false;
    }
  }, []);

  // Listen for app-resume events (from useAppLifecycle)
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    window.addEventListener('app-resume', handleResume);

    return () => {
      window.removeEventListener('app-resume', handleResume);
    };
  }, [handleResume]);

  return { forceResume: handleResume };
}

/**
 * Helper hook for data hooks to listen for coordinated resume
 */
export function useOnAppResumeReady(callback: () => void) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    const handler = () => callbackRef.current();
    window.addEventListener('app-resume-ready', handler);
    return () => window.removeEventListener('app-resume-ready', handler);
  }, []);
}
