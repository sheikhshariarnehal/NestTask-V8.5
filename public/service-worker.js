// NestTask Service Worker v4 - Optimized & Clean
const VERSION = 'v4';
const CACHE_PREFIX = 'nesttask';
const STATIC_CACHE = `${CACHE_PREFIX}-static-${VERSION}`;
const DYNAMIC_CACHE = `${CACHE_PREFIX}-dynamic-${VERSION}`;
const OFFLINE_URL = '/offline.html';

// Critical assets for offline functionality
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Routes to exclude from caching
const EXCLUDED_ROUTES = [
  '/auth',
  '/login',
  '/reset-password',
  'supabase.co',
  'browser-sync',
  '_vercel/insights',
  'chrome-extension'
];

// Cache duration settings (in seconds)
const CACHE_DURATION = {
  static: 7 * 24 * 60 * 60,    // 7 days
  dynamic: 24 * 60 * 60,       // 1 day
  fonts: 30 * 24 * 60 * 60,    // 30 days
  api: 5 * 60                  // 5 minutes
};

// ===================
// Utility Functions
// ===================

/**
 * Check if URL should be cached
 */
function shouldCache(url) {
  try {
    const urlObj = new URL(url);
    
    // Only cache http/https
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }
    
    // Check exclusions
    return !EXCLUDED_ROUTES.some(route => url.includes(route));
  } catch {
    return false;
  }
}

/**
 * Check if request is for static asset
 */
function isStaticAsset(request) {
  const url = request.url;
  return /\.(css|js|woff2?|ttf|eot|svg|png|jpe?g|gif|webp|ico)(\?.*)?$/i.test(url);
}

/**
 * Check if request is for API
 */
function isApiRequest(url) {
  return url.includes('/api/') || url.includes('/rest/') || url.includes('/graphql');
}

/**
 * Clean expired entries from cache
 */
async function cleanExpiredCache(cacheName, maxAge) {
  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    const now = Date.now();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get('sw-cache-date');
        if (dateHeader && (now - parseInt(dateHeader)) > maxAge * 1000) {
          await cache.delete(request);
        }
      }
    }
  } catch {
    // Silent fail
  }
}

/**
 * Add timestamp to cached response
 */
function addCacheTimestamp(response) {
  const headers = new Headers(response.headers);
  headers.set('sw-cache-date', Date.now().toString());
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

// ===================
// Install Event
// ===================

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('Precache failed:', err))
  );
});

// ===================
// Activate Event
// ===================

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean old caches
      caches.keys().then(keys => 
        Promise.all(
          keys
            .filter(key => key.startsWith(CACHE_PREFIX) && 
                         key !== STATIC_CACHE && 
                         key !== DYNAMIC_CACHE)
            .map(key => caches.delete(key))
        )
      ),
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// ===================
// Fetch Event
// ===================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;
  
  // Skip non-GET and excluded requests
  if (request.method !== 'GET' || !shouldCache(url)) {
    return;
  }
  
  // Navigation requests - Network first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Cache successful navigation responses
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => cache.put(request, addCacheTimestamp(clone)));
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }
  
  // Static assets - Cache first with network fallback
  if (isStaticAsset(request)) {
    event.respondWith(
      caches.match(request)
        .then(cached => {
          if (cached) {
            // Update cache in background
            fetch(request)
              .then(response => {
                if (response.ok) {
                  caches.open(STATIC_CACHE)
                    .then(cache => cache.put(request, addCacheTimestamp(response)));
                }
              })
              .catch(() => {});
            return cached;
          }
          
          return fetch(request)
            .then(response => {
              if (response.ok) {
                const clone = response.clone();
                caches.open(STATIC_CACHE)
                  .then(cache => cache.put(request, addCacheTimestamp(clone)));
              }
              return response;
            });
        })
    );
    return;
  }
  
  // API requests - Network first with cache fallback
  if (isApiRequest(url)) {
    event.respondWith(
      Promise.race([
        fetch(request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(cache => cache.put(request, addCacheTimestamp(clone)));
          }
          return response;
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 5000)
        )
      ]).catch(() => caches.match(request))
    );
    return;
  }
  
  // Default - Network first
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then(cache => cache.put(request, addCacheTimestamp(clone)));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ===================
// Message Handler
// ===================

self.addEventListener('message', (event) => {
  const { data, source } = event;
  
  if (!data?.type) return;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CLEAR_CACHES':
      caches.keys()
        .then(keys => Promise.all(keys.map(key => caches.delete(key))))
        .then(() => {
          source?.postMessage({ type: 'CACHES_CLEARED', success: true });
        });
      break;
      
    case 'HEALTH_CHECK':
      caches.keys().then(keys => {
        source?.postMessage({
          type: 'HEALTH_STATUS',
          status: {
            version: VERSION,
            cacheCount: keys.length,
            isHealthy: true,
            timestamp: Date.now()
          }
        });
      });
      break;
      
    case 'GET_VERSION':
      source?.postMessage({ type: 'VERSION', version: VERSION });
      break;
  }
});

// ===================
// Periodic Cache Cleanup
// ===================

// Clean expired cache entries periodically
setInterval(() => {
  cleanExpiredCache(STATIC_CACHE, CACHE_DURATION.static);
  cleanExpiredCache(DYNAMIC_CACHE, CACHE_DURATION.dynamic);
}, 60 * 60 * 1000); // Every hour
