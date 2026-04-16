// Mr. Workout — Service Worker
// Enables PWA "Add to Home Screen" install prompt on Chrome Android

const CACHE_NAME = 'mrworkout-v1';

// Assets to pre-cache on install
const PRECACHE = [
    '/',
    '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)).catch(() => {})
    );
});

self.addEventListener('activate', (event) => {
    // Remove old caches
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle same-origin GET requests
    if (request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;

    // Skip API routes and auth — always network-first
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) return;

    // Network-first strategy: try network, fall back to cache
    event.respondWith(
        fetch(request)
            .then(response => {
                // Cache successful responses (pages, assets)
                if (response.ok && !url.pathname.includes('_next/')) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});
