// Bump to drop old caches after changing what's precached.
const VERSION = 'v1';
const STATIC = `static-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== STATIC).map((k) => caches.delete(k))))
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;

    // Full page loads: always hit the server (auth, CSRF and data must stay fresh); show the offline page if it can't be reached.
    if (req.mode === 'navigate') {
        event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
        return;
    }

    // Vite's hashed build files and fonts never change for a given URL: serve from cache, fill on first use.
    if (url.pathname.startsWith('/build/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/fonts/')) {
        event.respondWith(
            caches.match(req).then(
                (hit) =>
                    hit ||
                    fetch(req).then((res) => {
                        if (res.ok) {
                            const copy = res.clone();
                            caches.open(STATIC).then((c) => c.put(req, copy));
                        }
                        return res;
                    }),
            ),
        );
    }
    // Everything else (Inertia XHR, API calls) goes straight to the network.
});
