/* Ranch Expense Tracker v1.5.0
   PDF Accounting Review Update

   App records are NOT stored here. Expenses/settings use localStorage and
   receipt files use IndexedDB. This worker manages only offline application
   files.
*/
const APP_VERSION = "1.5.0";
const CACHE_PREFIX = "ranch-expense-tracker-shell-";
const CACHE_NAME = `${CACHE_PREFIX}${APP_VERSION}`;
const OFFLINE_APP = "./index.html";

async function fetchFresh(request) {
  const freshRequest = new Request(request, { cache: "no-store" });
  return fetch(freshRequest);
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(new Request(OFFLINE_APP, { cache: "reload" }));
      if (response && response.ok) {
        await cache.put(OFFLINE_APP, response.clone());
      }
    } catch (error) {
      console.warn("Ranch Expense Tracker offline seed failed.", error);
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin && /\/service-worker\.js$/i.test(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetchFresh(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(OFFLINE_APP, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await caches.match(OFFLINE_APP, { cacheName: CACHE_NAME });
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  if (sameOrigin) {
    event.respondWith((async () => {
      try {
        const response = await fetchFresh(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (error) {
        const cached = await caches.match(request, { cacheName: CACHE_NAME });
        if (cached) return cached;
        throw error;
      }
    })());
  }
});
