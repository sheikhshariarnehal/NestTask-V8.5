/**
 * Initialize PWA features
 */
export function initPWA(): void {
  // PWA features are for browsers. In Capacitor (native WebView), service workers
  // can cause stale caching and blank screens after updates.
  if (typeof window !== 'undefined' && (window as any).Capacitor) {
    return;
  }

  // Check for updates periodically
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    // Check for service worker updates every hour
    setInterval(() => {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.update();
        }
      });
    }, 60 * 60 * 1000); // 1 hour
  }

  // Handle app install prompt
  let deferredPrompt: any;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // You can show an install button here if needed
  });

  // Handle app installed
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
  });

  // Handle service worker updates
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Optionally show a notification that app has been updated
      if (navigator.serviceWorker.controller) {
        console.log('[PWA] App has been updated');
      }
    });
  }
}
