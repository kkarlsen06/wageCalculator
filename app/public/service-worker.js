/*
  Service Worker for Lønnskalkulator
  - Versioned caches for static and runtime assets
  - Pre-caches build assets discovered from index.html and webmanifest
  - Cache-first for same-origin build assets
  - Network-first with cache fallback for cross-origin GET requests
*/

// Auto-incremented version - update when making changes to caching logic
const VERSION = 'v2';
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

