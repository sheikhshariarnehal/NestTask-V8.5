/**
 * NestTask Service Worker (TypeScript/Workbox)
 * Optimized for performance and reliability
 */

/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// ===================
// Constants
// ===================

const VERSION = 'v5';
const CACHE_PREFIX = 'nesttask';
const STATIC_CACHE = `${CACHE_PREFIX}-static-${VERSION}`;
const FONT_CACHE = `${CACHE_PREFIX}-fonts-${VERSION}`;
const IMAGE_CACHE = `${CACHE_PREFIX}-images-${VERSION}`;
const DYNAMIC_CACHE = `${CACHE_PREFIX}-dynamic-${VERSION}`;
const OFFLINE_URL = '/offline.html';

// Routes to exclude from caching
const EXCLUDED_PATTERNS = [
  /\/auth/,
  /\/login/,
  /\/signup/,
  /\/reset-password/,
  /supabase\.co/,
  /_vercel\/insights/,
  /chrome-extension/,
  /browser-sync/
];

// ===================
// Setup
// ===================

// Clean old caches
cleanupOutdatedCaches();

// Precache critical assets from build manifest
precacheAndRoute(self.__WB_MANIFEST || []);

// ===================
// Utility Functions
// ===================

/**
 * Check if URL should be cached
 */
function shouldCache(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Only http/https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    // Check exclusion patterns
    return !EXCLUDED_PATTERNS.some(pattern => pattern.test(url));
  } catch {
    return false;
  }
}

// ===================
// Caching Strategies
// ===================

// Static assets (JS, CSS) - Stale While Revalidate
registerRoute(
  ({ request, url }) => {
    if (!shouldCache(url.href)) return false;
    return request.destination === 'script' || request.destination === 'style';
  },
  new StaleWhileRevalidate({
    cacheName: STATIC_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        purgeOnQuotaError: true
      })
    ]
  })
);

// Fonts - Cache First (fonts rarely change)
registerRoute(
  ({ request, url }) => {
    if (!shouldCache(url.href)) return false;
    return request.destination === 'font' ||
           url.hostname.includes('fonts.googleapis.com') ||
           url.hostname.includes('fonts.gstatic.com');
  },
  new CacheFirst({
    cacheName: FONT_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 15,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        purgeOnQuotaError: true
      })
    ]
  })
);

// Images - Cache First with limited entries
registerRoute(
  ({ request, url }) => {
    if (!shouldCache(url.href)) return false;
    return request.destination === 'image';
  },
  new CacheFirst({
    cacheName: IMAGE_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        purgeOnQuotaError: true
      })
    ]
  })
);

// ===================
// Event Handlers
// ===================

// Install - Skip waiting
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate - Claim clients and cleanup
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean old caches
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith(CACHE_PREFIX) && ![STATIC_CACHE, FONT_CACHE, IMAGE_CACHE, DYNAMIC_CACHE].includes(key))
            .map(key => caches.delete(key))
        )
      )
    ])
  );
});

// Fetch - Handle navigation requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET
  if (request.method !== 'GET') return;
  
  // Handle navigation - Network first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL) as Promise<Response>)
    );
  }
});

// Message handler
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (!data?.type) return;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHES':
      caches.keys()
        .then(keys => Promise.all(keys.map(key => caches.delete(key))))
        .then(() => {
          event.source?.postMessage({ type: 'CACHES_CLEARED', success: true });
        });
      break;
      
    case 'HEALTH_CHECK':
      caches.keys().then(keys => {
        event.source?.postMessage({
          type: 'HEALTH_STATUS',
          status: {
            version: VERSION,
            caches: keys.length,
            healthy: true,
            timestamp: Date.now()
          }
        });
      });
      break;
      
    case 'GET_VERSION':
      event.source?.postMessage({ type: 'VERSION', version: VERSION });
      break;
  }
});

export {};