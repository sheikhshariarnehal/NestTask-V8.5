import { useRef, useCallback } from 'react';
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

  const handleAppStateChange = useCallback((isActive: boolean) => {
    if (stateRef.current.isActive === isActive) return;
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
