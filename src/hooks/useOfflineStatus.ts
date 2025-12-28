import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // For native platforms, use Capacitor's Network plugin
    if (Capacitor.isNativePlatform()) {
      let isMounted = true;

      // Get initial network status
      Network.getStatus().then(status => {
        if (isMounted) {
          setIsOffline(!status.connected);
        }
      }).catch(err => {
        console.error('Failed to get network status:', err);
      });

      // Listen for network status changes
      const networkListener = Network.addListener('networkStatusChange', status => {
        if (isMounted) {
          setIsOffline(!status.connected);
        }
      });

      return () => {
        isMounted = false;
        networkListener.then(listener => listener.remove());
      };
    } else {
      // For web, use browser APIs
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  return isOffline;
} 