// NestTask Service Worker - No Cache (Network Only)
const VERSION = 'v5-nocache';

// ===================
// Install - Immediate activation
// ===================
self.addEventListener('install', () => {
  self.skipWaiting();
});

// ===================
// Activate - Clean all caches & claim clients
// ===================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Delete ALL existing caches
      caches.keys().then(keys => 
        Promise.all(keys.map(key => caches.delete(key)))
      ),
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// ===================
// Fetch - Network only (no caching)
// ===================
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Always fetch from network
  event.respondWith(
    fetch(event.request).catch(() => {
      // Return offline page only for navigation requests
      if (event.request.mode === 'navigate') {
        return new Response(
          '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc;color:#1e293b;text-align:center}@media(prefers-color-scheme:dark){body{background:#0f172a;color:#f1f5f9}}.c{max-width:320px;padding:2rem}h1{font-size:1.25rem;margin-bottom:0.5rem}p{color:#64748b;margin-bottom:1.5rem}button{background:#0284c7;color:#fff;border:none;padding:0.75rem 1.5rem;border-radius:0.5rem;cursor:pointer}button:hover{background:#0369a1}</style></head><body><div class="c"><h1>You\'re offline</h1><p>Check your connection and try again.</p><button onclick="location.reload()">Retry</button></div><script>addEventListener("online",()=>location.reload())</script></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
      // For other requests, just fail
      return new Response('Network error', { status: 503 });
    })
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
        .then(() => source?.postMessage({ type: 'CACHES_CLEARED', success: true }));
      break;
      
    case 'GET_VERSION':
      source?.postMessage({ type: 'VERSION', version: VERSION });
      break;
  }
});
