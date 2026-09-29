/* Pockeazy service worker — push notifications + offline fallback page */
const CACHE = 'pockeazy-v3';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && !k.startsWith('pockeazy-data') && !k.startsWith('pockeazy-pages') && !k.startsWith('pockeazy-static')).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/*
 * Offline mode
 * - Pages and your data (GET /api/...) are network-first: always fresh online, last copy offline.
 * - Next.js build files (/_next/static) never change, so they are cache-first.
 * - Signing out deletes the "data" and "pages" caches (see src/lib/client/session.js).
 */
const DATA = 'pockeazy-data-v1';
const PAGES = 'pockeazy-pages-v1';
const STATIC = 'pockeazy-static-v1';
const NO_CACHE_API = /^\/api\/(auth|cron|quick-action|push|password|register|user\/export)/;

async function networkFirst(request, cacheName, fallback) {
  try {
    const res = await fetch(request);
    if (res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(cacheName).then((c) => c.put(request, copy)).catch(() => {});
    }
    return res;
  } catch (err) {
    const hit = await caches.match(request, { ignoreVary: true });
    if (hit) return hit;
    if (fallback) return (await caches.match(fallback)) || Response.error();
    throw err;
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    const copy = res.clone();
    caches.open(STATIC).then((c) => c.put(request, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, PAGES, OFFLINE_URL));
    return;
  }
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(req));
    return;
  }
  // Client-side page transitions in Next.js (React Server Component payloads)
  if (url.searchParams.has('_rsc')) {
    event.respondWith(networkFirst(req, PAGES));
    return;
  }
  if (url.pathname.startsWith('/api/') && !NO_CACHE_API.test(url.pathname)) {
    event.respondWith(networkFirst(req, DATA));
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'clear-user-cache') {
    event.waitUntil(Promise.all([caches.delete(DATA), caches.delete(PAGES)]));
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'Pockeazy', body: event.data && event.data.text() };
  }
  const title = data.title || 'Pockeazy reminder';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag,
      renotify: true,
      vibrate: [120, 60, 120],
      actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : [],
      data: { url: data.url || '/dashboard', meta: data.meta || null },
    })
  );
});

function openApp(path) {
  const url = new URL(path || '/dashboard', self.location.origin).href;
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
    for (const w of wins) {
      if (w.url.startsWith(self.location.origin) && 'focus' in w) {
        w.navigate(url);
        return w.focus();
      }
    }
    return self.clients.openWindow(url);
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// "✓ Done", "⏰ In 1 hour" and "✓ Mark as paid" buttons work without opening the app
async function quickAction(action, meta, fallbackUrl) {
  try {
    const res = await fetch('/api/quick-action', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: meta.kind, id: meta.id, action }),
    });
    if (!res.ok) throw new Error('failed');
    const data = await res.json().catch(() => ({}));
    await self.registration.showNotification('Pockeazy', {
      body: data.message || 'Done',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'pockeazy-confirm',
      silent: true,
    });
    await wait(4000);
    const shown = await self.registration.getNotifications({ tag: 'pockeazy-confirm' });
    shown.forEach((n) => n.close());
    // Let open tabs refresh their lists
    const wins = await self.clients.matchAll({ type: 'window' });
    wins.forEach((w) => w.postMessage({ type: 'pockeazy-refresh' }));
  } catch {
    // Not signed in on this device, or offline — open the app instead
    await openApp(fallbackUrl);
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url, meta } = event.notification.data || {};
  if (event.action && meta && meta.id) {
    event.waitUntil(quickAction(event.action, meta, url));
    return;
  }
  event.waitUntil(openApp(url));
});
