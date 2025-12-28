/**
 * Utility functions for handling PWA integration
 */

// Check if we're running in StackBlitz
const isStackBlitz = Boolean(
  typeof window !== 'undefined' && 
  (window.location.hostname.includes('stackblitz.io') || 
   window.location.hostname.includes('.webcontainer.io'))
);

// Service worker metadata in localStorage for persistence across browser sessions
const SW_METADATA_KEY = 'sw_metadata';
const APP_LAST_ACTIVE_KEY = 'app_last_active';
const OFFLINE_DURATION_THRESHOLD = 60 * 60 * 1000; // 1 hour in milliseconds

// Track service worker registration state
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

// Store of service worker metadata
interface ServiceWorkerMetadata {
  lastPing: number;
  lastResponse: number;
  status: 'active' | 'inactive' | 'errored';
  errors: string[];
  reinstallCount: number;
  lastReinstall: number | null;
  version: string;
}

// Initialize or get service worker metadata
function getServiceWorkerMetadata(): ServiceWorkerMetadata {
  try {
    const metadataStr = localStorage.getItem(SW_METADATA_KEY);
    if (metadataStr) {
      return JSON.parse(metadataStr);
    }
  } catch (e) {
    console.error('Error parsing service worker metadata:', e);
  }
  
  // Default metadata
  return {
    lastPing: 0,
    lastResponse: 0,
    status: 'inactive',
    errors: [],
    reinstallCount: 0,
    lastReinstall: null,
    version: '1.0'
  };
}

// Save service worker metadata
function saveServiceWorkerMetadata(metadata: ServiceWorkerMetadata): void {
  try {
    localStorage.setItem(SW_METADATA_KEY, JSON.stringify(metadata));
  } catch (e) {
    console.error('Error saving service worker metadata:', e);
  }
}

// Update last active timestamp
function updateLastActiveTimestamp(): void {
  try {
    localStorage.setItem(APP_LAST_ACTIVE_KEY, Date.now().toString());
  } catch (e) {
    console.error('Error updating last active timestamp:', e);
  }
}

// Get last active timestamp
function getLastActiveTimestamp(): number {
  try {
    const timestamp = localStorage.getItem(APP_LAST_ACTIVE_KEY);
    return timestamp ? parseInt(timestamp, 10) : 0;
  } catch (e) {
    console.error('Error getting last active timestamp:', e);
    return 0;
  }
}

// Check if we're running in StackBlitz
function isStackBlitzEnvironment(): boolean {
  return isStackBlitz;
}

// Check if the app can be installed
export function checkInstallability() {
  if (isStackBlitzEnvironment()) {
    console.log('Installation not supported in StackBlitz environment');
    return;
  }

  if ('BeforeInstallPromptEvent' in window) {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      (window as any).deferredPrompt = e;
    });
  }
}

// Request to install the PWA
export async function installPWA() {
  if (isStackBlitzEnvironment()) {
    console.log('Installation not supported in StackBlitz environment');
    return false;
  }

  const deferredPrompt = (window as any).deferredPrompt;
  if (!deferredPrompt) return false;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  (window as any).deferredPrompt = null;
  return outcome === 'accepted';
}

// Keep alive ping to service worker with exponential backoff
async function pingServiceWorker(attempt = 1): Promise<boolean> {
  if (!serviceWorkerRegistration || !navigator.serviceWorker.controller) {
    return false;
  }
  
  try {
    // Get metadata
    const metadata = getServiceWorkerMetadata();
    
    // Record ping time
    metadata.lastPing = Date.now();
    saveServiceWorkerMetadata(metadata);
    
    // Create a MessageChannel for two-way communication
    const messageChannel = new MessageChannel();
    
    // Create a promise that resolves when we get a response
    const responsePromise = new Promise<boolean>((resolve) => {
      // Timeout increases with retry attempts (3s, 6s, 12s)
      const timeoutDuration = Math.min(3000 * Math.pow(2, attempt - 1), 15000);
      
      const timeoutId = setTimeout(() => {
        // Timeout after dynamic duration
        messageChannel.port1.onmessage = null;
        resolve(false);
        
        // Record timeout in metadata
        const updatedMetadata = getServiceWorkerMetadata();
        updatedMetadata.errors.push(`Ping timeout at ${new Date().toISOString()} (attempt ${attempt})`);
        if (updatedMetadata.errors.length > 10) {
          updatedMetadata.errors = updatedMetadata.errors.slice(-10);
        }
        updatedMetadata.status = attempt > 2 ? 'errored' : updatedMetadata.status;
        saveServiceWorkerMetadata(updatedMetadata);
      }, timeoutDuration);
      
      // Listen for the response
      messageChannel.port1.onmessage = (event) => {
        clearTimeout(timeoutId);
        
        if (event.data && event.data.type === 'KEEP_ALIVE_RESPONSE') {
          // Record successful response in metadata
          const updatedMetadata = getServiceWorkerMetadata();
          updatedMetadata.lastResponse = Date.now();
          updatedMetadata.status = 'active';
          saveServiceWorkerMetadata(updatedMetadata);
          
          resolve(true);
        } else {
          resolve(false);
        }
      };
    });
    
    // Send the message
    navigator.serviceWorker.controller.postMessage({
      type: 'KEEP_ALIVE',
      timestamp: Date.now()
    }, [messageChannel.port2]);
    
    return responsePromise;
  } catch (e) {
    console.error('Error pinging service worker:', e);
    return false;
  }
}

// Check service worker health with retry mechanism
async function checkServiceWorkerHealth(retries = 2): Promise<boolean> {
  if (!serviceWorkerRegistration || !navigator.serviceWorker.controller) {
    return false;
  }
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create a MessageChannel for two-way communication
      const messageChannel = new MessageChannel();
      
      // Create a promise that resolves when we get a response
      const responsePromise = new Promise<boolean>((resolve) => {
        // Increase timeout with each attempt
        const timeout = 3000 + (attempt * 2000);
        
        const timeoutId = setTimeout(() => {
          messageChannel.port1.onmessage = null;
          resolve(false);
        }, timeout);
        
        // Listen for the response
        messageChannel.port1.onmessage = (event) => {
          clearTimeout(timeoutId);
          
          if (event.data && event.data.type === 'HEALTH_STATUS') {
            console.log('[PWA] Service worker health status:', event.data.status);
            resolve(event.data.status.isResponding);
          } else {
            resolve(false);
          }
        };
      });
      
      // Send the message
      navigator.serviceWorker.controller.postMessage({
        type: 'HEALTH_CHECK',
        timestamp: Date.now()
      }, [messageChannel.port2]);
      
      const result = await responsePromise;
      if (result) return true;
      
      // If not successful, add small delay before retry
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (e) {
      console.error(`Error checking service worker health (attempt ${attempt + 1}):`, e);
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  
  return false;
}

// Setup regular keep-alive pings to prevent service worker termination
function setupKeepAlive() {
  if (isStackBlitzEnvironment()) return;
  
  // Update active timestamp every minute
  const activeInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      updateLastActiveTimestamp();
    }
  }, 60000);
  
  // Ping every 30 seconds to keep the service worker alive
  const pingInterval = setInterval(async () => {
    let pingSuccessful = false;
    
    // Try up to 3 times with exponential backoff
    for (let attempt = 1; attempt <= 3; attempt++) {
      pingSuccessful = await pingServiceWorker(attempt);
      if (pingSuccessful) break;
      
      // Wait before retry
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
    
    if (!pingSuccessful) {
      console.warn('[PWA] Service worker ping failed after retries, checking health...');
      
      // If ping fails, check health and potentially reinstall
      const isHealthy = await checkServiceWorkerHealth();
      if (!isHealthy) {
        console.warn('[PWA] Service worker health check failed, attempting repair...');
        
        // Get metadata to check reinstall history
        const metadata = getServiceWorkerMetadata();
        const now = Date.now();
        
        // Limit reinstalls to prevent infinite loops (max 3 times in 30 minutes)
        const thirtyMinutesAgo = now - (30 * 60 * 1000);
        if (metadata.reinstallCount < 3 || metadata.lastReinstall === null || metadata.lastReinstall < thirtyMinutesAgo) {
          metadata.reinstallCount = metadata.lastReinstall && metadata.lastReinstall > thirtyMinutesAgo 
            ? metadata.reinstallCount + 1 
            : 1;
          metadata.lastReinstall = now;
          saveServiceWorkerMetadata(metadata);
          
          // Reinstall service worker
          await reinstallServiceWorker();
        } else {
          console.error('[PWA] Too many service worker reinstalls, giving up for now');
          metadata.errors.push(`Too many reinstalls at ${new Date().toISOString()}`);
          if (metadata.errors.length > 10) {
            metadata.errors = metadata.errors.slice(-10);
          }
          saveServiceWorkerMetadata(metadata);
          
          // Don't force reload - just log the error and let the user refresh manually if needed
          console.warn('[PWA] Service worker issues detected, manual refresh may be needed');
        }
      }
    }
  }, 30000); // Every 30 seconds
  
  // Clean up interval when page unloads
  window.addEventListener('beforeunload', () => {
    clearInterval(pingInterval);
    clearInterval(activeInterval);
  });
  
  // Handle visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateLastActiveTimestamp();
      
      // Check service worker when tab becomes visible again
      setTimeout(async () => {
        const isHealthy = await checkServiceWorkerHealth();
        if (!isHealthy) {
          console.warn('[PWA] Service worker unhealthy after visibility change, attempting repair');
          await reinstallServiceWorker();
        }
      }, 1000);
    }
  });
}

// Attempt to reinstall the service worker
async function reinstallServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (isStackBlitzEnvironment()) {
    return null;
  }
  
  try {
    console.log('[PWA] Attempting to reinstall service worker...');
    
    // Unregister existing service workers
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(reg => reg.unregister()));
    
    // Clear caches to ensure a clean slate
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map(key => caches.delete(key)));
    
    // Small delay to ensure clean unregister
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Register a new service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/',
      updateViaCache: 'none'
    });
    
    serviceWorkerRegistration = registration;
    setupUpdateHandler(registration);
    
    // Wait for the service worker to be installed
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        if (!registration.installing) {
          resolve();
          return;
        }
        
        const worker = registration.installing;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') {
            resolve();
          }
        });
        
        // Timeout safety
        setTimeout(resolve, 10000);
      });
    }
    
    console.log('[PWA] Service worker reinstalled successfully');
    
    // Update metadata
    const metadata = getServiceWorkerMetadata();
    metadata.status = 'active';
    metadata.version = '1.0'; // Update version if needed
    saveServiceWorkerMetadata(metadata);
    
    return registration;
  } catch (error) {
    console.error('[PWA] Service worker reinstallation failed:', error);
    return null;
  }
}

// Clean stale caches
async function cleanStaleCaches(): Promise<void> {
  if (!('caches' in window)) return;
  
  try {
    const cacheKeys = await caches.keys();
    const now = Date.now();
    
    // Get cached timestamp if available
    for (const key of cacheKeys) {
      try {
        const cache = await caches.open(key);
        const timestampResponse = await cache.match('/__timestamp');
        
        if (timestampResponse) {
          const timestampData = await timestampResponse.json();
          const cacheTimestamp = timestampData.timestamp || 0;
          
          // If cache is older than 7 days, delete it
          if (now - cacheTimestamp > 7 * 24 * 60 * 60 * 1000) {
            console.log(`[PWA] Deleting stale cache: ${key}`);
            await caches.delete(key);
          }
        }
      } catch (e) {
        // If we can't read timestamp, delete the cache to be safe
        console.warn(`[PWA] Couldn't verify cache ${key} timestamp, deleting:`, e);
        await caches.delete(key);
      }
    }
  } catch (e) {
    console.error('[PWA] Error cleaning stale caches:', e);
  }
}

// Register service worker for offline support
export async function registerServiceWorker() {
  // Early return if in StackBlitz
  if (isStackBlitzEnvironment()) {
    console.log('Service Worker registration skipped - running in StackBlitz environment');
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return null;
  }
  
  if (serviceWorkerRegistration) return serviceWorkerRegistration;
  
  try {
    // Update active timestamp
    updateLastActiveTimestamp();
    
    // Check for existing service worker registrations
    const registrations = await navigator.serviceWorker.getRegistrations();
    const existingRegistration = registrations.find(reg => 
      reg.active && reg.scope.includes(window.location.origin)
    );
    
    if (existingRegistration) {
      serviceWorkerRegistration = existingRegistration;
      setupUpdateHandler(existingRegistration);
      
      // Setup keep-alive pings
      setupKeepAlive();
      
      // Check if we need to perform maintenance after a long absence
      await performMaintenanceIfNeeded();
      
      return existingRegistration;
    }
    
    // Register with timeout to avoid hanging
    const registration = await Promise.race([
      navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none',
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
    ]) as ServiceWorkerRegistration | null;
    
    if (!registration) {
      console.warn('Service Worker registration timed out');
      return null;
    }
    
    serviceWorkerRegistration = registration;
    setupUpdateHandler(registration);
    
    // Initialize metadata
    const metadata = getServiceWorkerMetadata();
    metadata.status = 'active';
    saveServiceWorkerMetadata(metadata);
    
    // Setup keep-alive pings
    setupKeepAlive();
    
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

// Handle service worker updates
function setupUpdateHandler(registration: ServiceWorkerRegistration) {
  if (isStackBlitzEnvironment()) return;

  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing;
    if (newWorker) {
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('sw-update-available'));
        }
      });
    }
  });
}

// Perform maintenance if the app hasn't been used for a while
async function performMaintenanceIfNeeded(): Promise<void> {
  const lastActive = getLastActiveTimestamp();
  const now = Date.now();
  
  // If last active timestamp is older than our threshold or doesn't exist
  if (lastActive === 0 || (now - lastActive > OFFLINE_DURATION_THRESHOLD)) {
    console.log('[PWA] App was inactive for extended period, performing maintenance');
    
    // Update timestamp immediately
    updateLastActiveTimestamp();
    
    try {
      // Clean up stale caches
      await cleanStaleCaches();
      
      // Force service worker update
      if (serviceWorkerRegistration) {
        await serviceWorkerRegistration.update();
      }
      
      // Check service worker health
      const isHealthy = await checkServiceWorkerHealth();
      if (!isHealthy) {
        console.log('[PWA] Service worker unhealthy after extended inactivity, reinstalling');
        await reinstallServiceWorker();
      }
      
      // Add a marker in localStorage that we've performed maintenance
      try {
        localStorage.setItem('last_maintenance', now.toString());
      } catch (e) {
        console.error('Error setting maintenance timestamp:', e);
      }
      
    } catch (e) {
      console.error('[PWA] Error performing maintenance after inactivity:', e);
    }
  }
}

// Initialize PWA features
export async function initPWA() {
  if (isStackBlitzEnvironment()) {
    console.log('PWA features disabled in StackBlitz environment');
    return false;
  }

  // Declare needsRecovery variable at function scope
  let needsRecovery = false;

  try {
    // Create offline detection and recovery system first
    setupOfflineDetection();
    
    // Update active timestamp
    updateLastActiveTimestamp();
    
    // Check if we need recovery after extended inactivity
    const lastActive = getLastActiveTimestamp();
    const now = Date.now();
    needsRecovery = lastActive === 0 || (now - lastActive > OFFLINE_DURATION_THRESHOLD);
    
    // If we've been inactive for a long time or are coming online after being offline
    if (needsRecovery && navigator.onLine) {
      console.log('[PWA] App needs recovery after extended inactivity');
      
      // Perform necessary cleanup
      await cleanStaleCaches();
      
      // First, try to reinstall the service worker
      await reinstallServiceWorker();
      
      // Force reload app shell resources
      await prefetchCriticalResources();
    } else {
      // Regular initialization path
      await Promise.allSettled([
        Promise.resolve().then(checkInstallability),
        Promise.resolve().then(registerServiceWorker),
        Promise.resolve().then(performMaintenanceIfNeeded)
      ]);
    }
    
    return true;
  } catch (error) {
    console.error('Error during PWA initialization:', error);
    
    // Don't force reload on recovery failure - just log and return
    if (needsRecovery) {
      console.warn('[PWA] Recovery failed, user may need to manually refresh');
    }
    
    return false;
  }
}

// Prefetch critical resources to ensure app shell is available
async function prefetchCriticalResources(): Promise<void> {
  try {
    // Prefetch the main HTML
    await fetch('/', { cache: 'reload' });
    
    // You could add additional critical resources here
    const criticalResources = [
      '/index.html',
      '/manifest.webmanifest',
      '/service-worker.js'
    ];
    
    await Promise.allSettled(
      criticalResources.map(url => 
        fetch(url, { cache: 'reload' }).catch(e => 
          console.warn(`[PWA] Failed to prefetch ${url}:`, e)
        )
      )
    );
  } catch (e) {
    console.error('[PWA] Error prefetching critical resources:', e);
  }
}

// Setup offline detection
function setupOfflineDetection(): void {
  // Setup offline detection
  window.addEventListener('online', () => {
    document.body.classList.remove('offline');
    
    // Trigger a service worker health check when coming online
    setTimeout(async () => {
      // If we've been offline for more than 5 minutes, check service worker and potentially reload
      const lastOfflineTimestamp = localStorage.getItem('lastOfflineTimestamp');
      if (lastOfflineTimestamp) {
        const offlineTime = Date.now() - parseInt(lastOfflineTimestamp, 10);
        const fiveMinutes = 5 * 60 * 1000;
        
        if (offlineTime > fiveMinutes) {
          const isHealthy = await checkServiceWorkerHealth();
          if (!isHealthy) {
            console.log('[PWA] Service worker unhealthy after coming online, performing recovery');
            await reinstallServiceWorker();
          }
          
          // Don't force reload after extended offline - just log and let user refresh if needed
          if (offlineTime > OFFLINE_DURATION_THRESHOLD) {
            console.log('[PWA] Coming online after extended offline period, service worker recovered');
          }
        }
      }
    }, 1000);
  });
  
  window.addEventListener('offline', () => {
    document.body.classList.add('offline');
    localStorage.setItem('lastOfflineTimestamp', Date.now().toString());
  });
  
  // Initial offline check
  if (!navigator.onLine) {
    document.body.classList.add('offline');
  }
}