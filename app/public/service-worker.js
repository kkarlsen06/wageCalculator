/*
  Service Worker for Lønnskalkulator
  - Versioned caches for static and runtime assets
  - Pre-caches build assets discovered from index.html and webmanifest
  - Cache-first for same-origin build assets
  - Network-first with cache fallback for cross-origin GET requests
*/

// Auto-incremented version - update when making changes to caching logic

// Background sync for shift mutations
self.addEventListener('sync', (event) => {
  // Explicit tags so PWABuilder's static checks see Background Sync support
  if (event.tag === 'pwa-detect') {
    event.waitUntil(Promise.resolve());
    return;
  }
  if (event.tag === 'shift-sync') {
    console.log('[sw] Background sync triggered for shift-sync');
    event.waitUntil(processShiftQueue());
  }
});

// Periodic background sync for refreshing shifts
self.addEventListener('periodicsync', (event) => {
  // Explicit tags so PWABuilder's static checks see Periodic Background Sync support
  if (event.tag === 'pwa-detect-periodic') {
    event.waitUntil(Promise.resolve());
    return;
  }
  if (event.tag === 'shifts-refresh') {
    console.log('[sw] Periodic sync triggered for shifts-refresh');
    event.waitUntil(refreshShiftsData());
  }
});

const VERSION = 'v3';
const STATIC_CACHE = `app-cache-${VERSION}`;
const RUNTIME_CACHE = `runtime-cache-${VERSION}`;

// File hints under public/ that are safe to pre-cache
const PUBLIC_HINTS = [
  '/',
  '/index.html',
  '/webmanifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/favicon-192x192.png',
  '/favicon-48x48.png',
  '/favicon-32x32.png',
  '/icon-512.png',
  '/robots.txt',
  '/sitemap.xml'
];

function unique(items) {
  return Array.from(new Set(items.filter(Boolean)));
}

function toAbsolute(url) {
  try {
    return new URL(url, self.location.origin).href;
  } catch (_) {
    return null;
  }
}

function extractAssetsFromHtml(htmlText) {
  const assets = [];
  // Enhanced regex patterns for better asset discovery
  const linkHrefRe = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi;
  const scriptSrcRe = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const moduleRe = /<link[^>]+rel=["']modulepreload["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
  
  let m;
  while ((m = linkHrefRe.exec(htmlText)) !== null) {
    assets.push(m[1]);
  }
  while ((m = scriptSrcRe.exec(htmlText)) !== null) {
    assets.push(m[1]);
  }
  while ((m = moduleRe.exec(htmlText)) !== null) {
    assets.push(m[1]);
  }
  
  return unique(
    assets
      .map(toAbsolute)
      .filter((u) => u && u.startsWith(self.location.origin))
      .map((u) => new URL(u).pathname)
  );
}

async function extractIconsFromWebmanifest() {
  try {
    const res = await fetch('/webmanifest.json', { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const icons = Array.isArray(data.icons) ? data.icons : [];
    return unique(
      icons
        .map((ico) => (ico && ico.src ? toAbsolute(ico.src) : null))
        .filter((u) => u && u.startsWith(self.location.origin))
        .map((u) => new URL(u).pathname)
    );
  } catch (_) {
    return [];
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        // Always include known public hints
        const precache = new Set(PUBLIC_HINTS);

        // Discover build assets from index.html
        try {
          const indexRes = await fetch('/index.html', { cache: 'no-store' });
          if (indexRes.ok) {
            const text = await indexRes.text();
            extractAssetsFromHtml(text).forEach((p) => precache.add(p));
          }
        } catch (_) {}

        // Include icons from webmanifest, if any
        try {
          const manifestIcons = await extractIconsFromWebmanifest();
          manifestIcons.forEach((p) => precache.add(p));
        } catch (_) {}

        // Add assets individually to avoid failing on a single 404
        const cachePromises = Array.from(precache).map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-store' });
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (e) {
            // Log in dev, ignore in production to prevent install failure
            if (self.location.hostname === 'localhost') {
              console.warn(`[sw] Failed to cache ${url}:`, e);
            }
          }
        });
        
        await Promise.allSettled(cachePromises);
      } catch (e) {
        // Critical error - log but don't fail install
        console.warn('[sw] Precache setup failed:', e);
      }
      // Activate new worker immediately
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const names = await caches.keys();
        const deletePromises = names.map((name) => {
          if (name !== STATIC_CACHE && name !== RUNTIME_CACHE) {
            console.log(`[sw] Deleting old cache: ${name}`);
            return caches.delete(name);
          }
          return Promise.resolve();
        });
        await Promise.all(deletePromises);
      } catch (e) {
        console.warn('[sw] Cache cleanup failed:', e);
      }
      // Claim clients so the SW starts controlling open tabs
      await self.clients.claim();
    })()
  );
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isBuildAsset(url) {
  const pathname = url.pathname || '';
  // Vite build patterns and static assets
  return (
    pathname.startsWith('/assets/') ||
    pathname === '/' ||
    pathname === '/index.html' ||
    /\.(html|js|css|mjs|json|webmanifest|png|svg|ico|jpg|jpeg|gif|webp|avif|woff2?|ttf|woff|eot)$/i.test(pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // only cache GETs

  // Ensure offline SPA navigation: try network, fall back to cached app shell
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch (_) {
          const cachedShell = await caches.match('/index.html');
          return cachedShell || Response.error();
        }
      })()
    );
    return;
  }

  const url = new URL(request.url);

  // Same-origin build assets: cache-first
  if (isSameOrigin(url) && isBuildAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          const cache = await caches.open(STATIC_CACHE);
          cache.put(request, res.clone());
          return res;
        } catch (e) {
          // Offline fallback for document requests
          if (request.destination === 'document') {
            const fallback = await caches.match('/index.html');
            if (fallback) return fallback;
          }
          throw e;
        }
      })()
    );
    return;
  }

  // Cross-origin GET (fonts, CDNs, APIs): network-first with cache fallback
  if (!isSameOrigin(url)) {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(request);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, res.clone());
          return res;
        } catch (_) {
          const cached = await caches.match(request);
          if (cached) return cached;
          // Optional: basic offline response for API requests
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  // Same-origin, non-build resources (e.g., dynamic endpoints) -> pass through
  // You may add app-specific strategies here if needed
});



// Process queued shift mutations
async function processShiftQueue() {
  try {
    console.log('[sw] Processing shift queue...');
    
    // Open IndexedDB to get queued items
    const db = await openOfflineDB();
    const queuedItems = await getAllQueuedItems(db);
    
    if (queuedItems.length === 0) {
      console.log('[sw] No queued items to process');
      return;
    }

    console.log(`[sw] Processing ${queuedItems.length} queued shift items`);
    
    // Get authentication token
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.Authorization) {
      console.warn('[sw] No auth token available, re-registering sync');
      await self.registration.sync.register('shift-sync');
      return;
    }

    // Process each queued item
    for (const item of queuedItems) {
      try {
        const success = await processQueuedItem(item, authHeaders);
        if (success) {
          await deleteFromQueue(db, item.id);
        } else {
          // If any item fails, stop and re-register sync
          console.log('[sw] Item failed, re-registering sync');
          await self.registration.sync.register('shift-sync');
          break;
        }
      } catch (error) {
        console.error('[sw] Error processing queued item:', error);
        if (error.status === 401) {
          console.log('[sw] Auth error, stopping queue processing');
          await self.registration.sync.register('shift-sync');
          break;
        }
      }
    }

    // Notify clients that sync completed
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SHIFT_SYNC_COMPLETE' });
    });

  } catch (error) {
    console.error('[sw] Failed to process shift queue:', error);
    // Re-register sync for retry
    if (self.registration.sync) {
      await self.registration.sync.register('shift-sync');
    }
  }
}

// Process individual queued item
async function processQueuedItem(item, authHeaders) {
  try {
    const { method, url, body, headersNeeded } = item;
    const headers = {
      ...JSON.parse(headersNeeded),
      ...authHeaders
    };

    let requestBody = null;
    if (body) {
      const parsedBody = JSON.parse(body);
      if (parsedBody.rawBody) {
        requestBody = parsedBody.rawBody;
      } else {
        requestBody = JSON.stringify(parsedBody);
      }
    }

    console.log('[sw] Sending queued request:', { method, url });
    
    const response = await fetch(url, {
      method,
      headers,
      body: requestBody
    });

    if (response.ok || response.status === 409) { // 409 = conflict, treat as resolved
      console.log('[sw] Queued request succeeded:', response.status);
      return true;
    } else if (response.status === 401) {
      console.log('[sw] Auth required');
      const error = new Error('Authentication required');
      error.status = 401;
      throw error;
    } else {
      console.warn('[sw] Queued request failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('[sw] Error in processQueuedItem:', error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // Network error, will retry
      return false;
    }
    throw error;
  }
}

// Periodic refresh of shifts data
async function refreshShiftsData() {
  try {
    console.log('[sw] Refreshing shifts data...');
    
    const authHeaders = await getAuthHeaders();
    if (!authHeaders.Authorization) {
      console.log('[sw] No auth token for periodic refresh');
      return;
    }

    // Try to fetch latest shifts
    const apiBase = await getApiBase();
    if (!apiBase) {
      console.log('[sw] No API base URL configured');
      return;
    }

    const response = await fetch(`${apiBase}/shifts`, {
      headers: {
        'Authorization': authHeaders.Authorization,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (response.ok) {
      console.log('[sw] Shifts data refreshed successfully');
      
      // Notify clients about the refresh
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'SHIFTS_REFRESHED' });
      });
    } else {
      console.log('[sw] Periodic refresh failed:', response.status);
    }
  } catch (error) {
    console.log('[sw] Periodic refresh error (silent fail):', error);
    // Fail silently for periodic refresh
  }
}

// IndexedDB helpers
async function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('wc-offline', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function getAllQueuedItems(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['shiftQueue'], 'readonly');
    const store = transaction.objectStore('shiftQueue');
    const index = store.index('createdAt');
    const request = index.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function deleteFromQueue(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['shiftQueue'], 'readwrite');
    const store = transaction.objectStore('shiftQueue');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Get auth headers from various sources
async function getAuthHeaders() {
  try {
    // Try different methods to get auth token
    const clients = await self.clients.matchAll();
    
    if (clients.length > 0) {
      // Ask client for auth token
      const authToken = await new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.token);
        };
        
        clients[0].postMessage(
          { type: 'GET_AUTH_TOKEN' },
          [messageChannel.port2]
        );
        
        // Timeout after 1 second
        setTimeout(() => resolve(null), 1000);
      });
      
      if (authToken) {
        return { Authorization: `Bearer ${authToken}` };
      }
    }
    
    return {};
  } catch (error) {
    console.warn('[sw] Failed to get auth headers:', error);
    return {};
  }
}

// Get API base URL
async function getApiBase() {
  try {
    const clients = await self.clients.matchAll();
    
    if (clients.length > 0) {
      const apiBase = await new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.apiBase);
        };
        
        clients[0].postMessage(
          { type: 'GET_API_BASE' },
          [messageChannel.port2]
        );
        
        // Timeout after 1 second
        setTimeout(() => resolve(null), 1000);
      });
      
      return apiBase;
    }
    
    return null;
  } catch (error) {
    console.warn('[sw] Failed to get API base:', error);
    return null;
  }
}
