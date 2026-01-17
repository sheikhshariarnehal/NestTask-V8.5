import { useRef, useCallback, useEffect } from 'react';
import { useAppLifecycle } from './useAppLifecycle';

interface BackgroundState {
  enteredBackgroundAt: number | null;
  backgroundDuration: number;
  wasInBackground: boolean;
  isActive: boolean;
}

/**
 * Hook to track when the app goes to background and returns
 * Emits events with duration information to help other hooks decide if refresh is needed
 */
export function useBackgroundStateManager() {
  const stateRef = useRef<BackgroundState>({
    enteredBackgroundAt: null,
    backgroundDuration: 0,
    wasInBackground: false,
    isActive: true
  });
  const mountTimeRef = useRef<number>(Date.now());
  const isSessionRecoveryInProgressRef = useRef<boolean>(false);

  const handleAppStateChange = useCallback((isActive: boolean) => {
    if (stateRef.current.isActive === isActive) return;
    
    // CRITICAL: Ignore blur events within first 60 seconds of mount (cold start protection)
    // During cold start with optimizations:
    // - Session validation: < 1s
    // - HTTP refresh if expired: 1-3s  
    // - setSession hydration: Now non-blocking (background)
    // Extended to 60s to handle slow devices and network
    const timeSinceMount = Date.now() - mountTimeRef.current;
    if (!isActive && timeSinceMount < 60000) {
      console.log(`[Background Manager] ⏳ Ignoring blur event ${Math.round(timeSinceMount / 1000)}s after mount (cold start protection)`);
      return;
    }
        // CRITICAL: Ignore blur events during active session recovery (setSession in progress)
    // If user switches tabs while seeing "Hydrating SDK..." we must NOT background
    if (!isActive && isSessionRecoveryInProgressRef.current) {
      console.log(`[Background Manager] 🔒 Ignoring blur event - session recovery in progress (don't interrupt critical auth)`);
      return;
    }
        stateRef.current.isActive = isActive;

    if (!isActive) {
      // App going to background
      stateRef.current.enteredBackgroundAt = Date.now();
      stateRef.current.wasInBackground = true;
      console.log('[Background Manager] App entered background');
    } else if (stateRef.current.enteredBackgroundAt) {
      // App returning from background
      stateRef.current.backgroundDuration = Date.now() - stateRef.current.enteredBackgroundAt;
      const durationSeconds = Math.round(stateRef.current.backgroundDuration / 1000);
      
      console.log(`[Background Manager] App resumed after ${durationSeconds}s`);
      
      // Emit event with duration to help hooks decide if full refresh is needed
      // Generally, > 30 seconds suggests data might be stale
      const requiresRefresh = stateRef.current.backgroundDuration > 30000; // 30 seconds
      
      window.dispatchEvent(new CustomEvent('app-resumed-from-background', {
        detail: {
          duration: stateRef.current.backgroundDuration,
          durationSeconds,
          requiresRefresh
        }
      }));
      
      stateRef.current.enteredBackgroundAt = null;
    }
  }, []);

  // Listen for session recovery events to prevent backgrounding during critical auth
  useEffect(() => {
    const handleRecoveryStart = () => {
      console.log('[Background Manager] 🔒 Session recovery started - preventing background state');
      isSessionRecoveryInProgressRef.current = true;
    };
    
    const handleRecoveryComplete = () => {
      console.log('[Background Manager] ✅ Session recovery complete - allowing background state');
      isSessionRecoveryInProgressRef.current = false;
    };
    
    window.addEventListener('supabase-session-recovery-start', handleRecoveryStart);
    window.addEventListener('supabase-session-recovery-complete', handleRecoveryComplete);
    
    return () => {
      window.removeEventListener('supabase-session-recovery-start', handleRecoveryStart);
      window.removeEventListener('supabase-session-recovery-complete', handleRecoveryComplete);
    };
  }, []);
  
  // Consume the centralized lifecycle hook instead of registering our own listeners.
  // This avoids multiple native plugin listeners and keeps resume semantics consistent.
  useAppLifecycle({
    onAppStateChange: handleAppStateChange,
    onVisibilityChange: (isVisible) => handleAppStateChange(isVisible)
  });

  return {
    getBackgroundDuration: () => stateRef.current.backgroundDuration,
    wasInBackground: () => stateRef.current.wasInBackground
  };
}
