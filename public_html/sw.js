/*
 * Тайный Санта — service worker офлайн-оболочки SPA.
 *
 * Стратегия: онлайн всегда сеть (свежие файлы), офлайн — ответ из кэша.
 * API (/api/) не перехватывается: у его ответов Cache-Control: no-store,
 * а экраны сами показывают сетевое сообщение. Оболочка (index.html, CSS,
 * модули, иконки) кладётся в кэш при установке.
 */
const VERSION = 'v1';
const CACHE = 'santa-' + VERSION;

const SHELL = [
    '/',
    '/index.html',
    '/manifest.webmanifest',
    '/assets/css/style.css',
    '/assets/img/favicon.svg',
    '/assets/img/icon-192.png',
    '/assets/img/icon-512.png',
    '/assets/img/icon-maskable-512.png',
    '/assets/img/apple-touch-icon.png',
    '/assets/js/main.js',
    '/assets/js/api.js',
    '/assets/js/router.js',
    '/assets/js/ui.js',
    '/assets/js/icons.js',
    '/assets/js/validators.js',
    '/assets/js/authors.js',
    '/assets/js/help.js',
    '/assets/js/winter-scene.js',
    '/assets/js/views/home.js',
    '/assets/js/views/role.js',
    '/assets/js/views/join.js',
    '/assets/js/views/create.js',
    '/assets/js/views/login.js',
    '/assets/js/views/recover.js',
    '/assets/js/views/cabinet.js',
    '/assets/js/views/password.js',
    '/assets/js/views/admin.js',
    '/assets/js/views/super.js',
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(CACHE);
        await cache.addAll(SHELL);
        await self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
        await self.clients.claim();
    })());
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') {
        return;
    }
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return;
    }
    if (url.pathname.startsWith('/api/')) {
        return;
    }

    event.respondWith((async () => {
        try {
            const response = await fetch(request);
            if (response && response.ok && response.type === 'basic') {
                const copy = response.clone();
                caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
            }
            return response;
        } catch (error) {
            const cached = await caches.match(request, { ignoreSearch: true });
            if (cached) {
                return cached;
            }
            if (request.mode === 'navigate') {
                const shell = await caches.match('/index.html');
                if (shell) {
                    return shell;
                }
            }
            throw error;
        }
    })());
});
