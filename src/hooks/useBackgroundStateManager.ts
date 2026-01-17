import { useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

interface BackgroundState {
  enteredBackgroundAt: number | null;
  backgroundDuration: number;
  wasInBackground: boolean;
}

/**
 * Hook to track when the app goes to background and returns
 * Emits events with duration information to help other hooks decide if refresh is needed
 */
export function useBackgroundStateManager() {
  const stateRef = useRef<BackgroundState>({
    enteredBackgroundAt: null,
    backgroundDuration: 0,
    wasInBackground: false
  });

  const handleAppStateChange = useCallback((isActive: boolean) => {
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

  useEffect(() => {
    // Listen to visibility changes (web/browser tabs)
    const handleVisibilityChange = () => {
      handleAppStateChange(!document.hidden);
    };

    // Listen to Capacitor app state changes (native apps)
    const setupCapacitor = async () => {
      if (Capacitor.isNativePlatform()) {
        const { App } = await import('@capacitor/app');
        App.addListener('appStateChange', ({ isActive }) => {
          handleAppStateChange(isActive);
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    setupCapacitor();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Note: Capacitor listeners cleanup is handled automatically on unmount
    };
  }, [handleAppStateChange]);

  return {
    getBackgroundDuration: () => stateRef.current.backgroundDuration,
    wasInBackground: () => stateRef.current.wasInBackground
  };
}
