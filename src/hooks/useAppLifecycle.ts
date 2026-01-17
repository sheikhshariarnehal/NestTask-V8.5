import { useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';

export interface AppLifecycleState {
  isVisible: boolean;
  isOnline: boolean;
  isActive: boolean;
}

export interface AppLifecycleCallbacks {
  onFocus?: () => void;
  onBlur?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
  onNetworkChange?: (isOnline: boolean) => void;
  onAppStateChange?: (isActive: boolean) => void;
  onResume?: () => void; // Called when app comes to foreground
}

/**
 * Comprehensive app lifecycle hook that handles:
 * - Browser tab focus/blur events
 * - Page visibility changes
 * - Network connectivity changes
 * - Capacitor app foreground/background transitions
 * 
 * This ensures data is refreshed when the user returns to the app
 * from another tab, app, or after reconnecting to the network.
 */
export function useAppLifecycle(callbacks: AppLifecycleCallbacks = {}) {
  const callbacksRef = useRef(callbacks);
  const stateRef = useRef<AppLifecycleState>({
    isVisible: !document.hidden,
    isOnline: navigator.onLine,
    isActive: true
  });
  const lastResumeTimeRef = useRef<number>(Date.now());
  const lastBlurTimeRef = useRef<number>(Date.now());
  const isNativePlatform = Capacitor.isNativePlatform();

  const dispatchResumeEvent = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('app-resume'));
  }, []);

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Handle window focus/blur
  const handleFocus = useCallback(() => {
    console.log('[Lifecycle] Window focused');
    callbacksRef.current.onFocus?.();

    // Minimizing/restoring or switching apps can trigger focus/blur without a visibilitychange.
    // Treat focus regain as a resume signal.
    if (!stateRef.current.isActive) {
      stateRef.current.isActive = true;
      callbacksRef.current.onAppStateChange?.(true);
    }

    const blurredDuration = Date.now() - lastBlurTimeRef.current;
    if (blurredDuration > 250) {
      callbacksRef.current.onResume?.();
      dispatchResumeEvent();
    }
  }, []);

  const handleBlur = useCallback(() => {
    console.log('[Lifecycle] Window blurred');
    callbacksRef.current.onBlur?.();

    stateRef.current.isActive = false;
    callbacksRef.current.onAppStateChange?.(false);
    lastBlurTimeRef.current = Date.now();
  }, []);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden;
    const wasVisible = stateRef.current.isVisible;
    stateRef.current.isVisible = isVisible;

    console.log(`[Lifecycle] Visibility changed: ${isVisible ? 'visible' : 'hidden'}`);
    
    if (isVisible && !wasVisible) {
      const hiddenDuration = Date.now() - lastResumeTimeRef.current;
      console.log(`[Lifecycle] App resumed after ${Math.round(hiddenDuration / 1000)}s`);
      
      // Call onResume callback when becoming visible
      callbacksRef.current.onResume?.();
      dispatchResumeEvent();
    } else if (!isVisible) {
      lastResumeTimeRef.current = Date.now();
    }

    callbacksRef.current.onVisibilityChange?.(isVisible);
  }, []);

  // Handle network status change
  const handleOnline = useCallback(() => {
    console.log('[Lifecycle] Network: online');
    stateRef.current.isOnline = true;
    callbacksRef.current.onNetworkChange?.(true);
    
    // Trigger resume when coming back online
    callbacksRef.current.onResume?.();
    dispatchResumeEvent();
  }, []);

  const handleOffline = useCallback(() => {
    console.log('[Lifecycle] Network: offline');
    stateRef.current.isOnline = false;
    callbacksRef.current.onNetworkChange?.(false);
  }, []);

  // Setup lifecycle listeners
  useEffect(() => {
    // Browser events
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Capacitor-specific events for mobile
    let networkListener: any = null;
    let appStateListener: any = null;

    if (isNativePlatform) {
      // Listen for foreground/background transitions
      App.addListener('appStateChange', (state) => {
        const wasActive = stateRef.current.isActive;
        stateRef.current.isActive = state.isActive;
        callbacksRef.current.onAppStateChange?.(state.isActive);

        if (state.isActive && !wasActive) {
          callbacksRef.current.onResume?.();
          dispatchResumeEvent();
        }
      }).then((listener) => {
        appStateListener = listener;
      }).catch((err) => {
        console.warn('[Lifecycle] Failed to add app state listener:', err);
      });

      // Listen for network status changes in Capacitor
      Network.addListener('networkStatusChange', (status) => {
        console.log(`[Lifecycle] Capacitor network: ${status.connected ? 'connected' : 'disconnected'}`);
        const wasOnline = stateRef.current.isOnline;
        stateRef.current.isOnline = status.connected;
        
        if (status.connected && !wasOnline) {
          // Network reconnected - trigger resume
          callbacksRef.current.onNetworkChange?.(true);
          callbacksRef.current.onResume?.();
          dispatchResumeEvent();
        } else if (!status.connected) {
          callbacksRef.current.onNetworkChange?.(false);
        }
      }).then(listener => {
        networkListener = listener;
      }).catch((err) => {
        console.warn('[Lifecycle] Failed to add network listener:', err);
      });
    }

    // Cleanup
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (isNativePlatform) {
        appStateListener?.remove();
        networkListener?.remove();
      }
    };
  }, [handleFocus, handleBlur, handleVisibilityChange, handleOnline, handleOffline, isNativePlatform, dispatchResumeEvent]);

  return {
    isVisible: stateRef.current.isVisible,
    isOnline: stateRef.current.isOnline,
    isActive: stateRef.current.isActive
  };
}
