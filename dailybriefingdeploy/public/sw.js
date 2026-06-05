// MIT Dining Ops service worker.
// Strategy: cache-first for versioned static assets, network-first for API and
// page navigations (so live ops data + the app shell never go stale), with a
// cache fallback when offline.
// Bumped to v2 with the new app icons — old caches (incl. the previous icons)
// are purged on activate.
const CACHE = 'dining-ops-v2';
const PRECACHE = [
  '/my-day',
  '/portfolio',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never intercept POST (e.g. /api/complete)

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // only same-origin

  const putInCache = (req, res) => {
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
    }
    return res;
  };

  // Network-first for API — always try fresh, fall back to cache when offline.
  // Never persist sensitive responses (briefing PII, auth/session) to the cache.
  if (url.pathname.startsWith('/api/')) {
    const sensitive = url.pathname.startsWith('/api/auth') || url.pathname.startsWith('/api/briefing');
    event.respondWith(
      sensitive
        ? fetch(request)
        : fetch(request)
            .then((res) => putInCache(request, res))
            .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for versioned/static assets.
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    /\.(png|jpg|jpeg|svg|ico|webp|woff2?|css|js|json)$/.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => putInCache(request, res)))
    );
    return;
  }

  // Network-first for navigations/pages, cache fallback, then the briefing shell.
  event.respondWith(
    fetch(request)
      .then((res) => putInCache(request, res))
      .catch(() => caches.match(request).then((c) => c || caches.match('/my-day')))
  );
});
