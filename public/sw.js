// Offline-first Service Worker for صقور اللواء الأول مغاوير
const CACHE_NAME = "soqour-v3";
const PRECACHE = [
  "/",
  "/login",
  "/missions",
  "/missions/new",
  "/allocations",
  "/custody",
  "/stats",
  "/settings",
  "/manifest.json",
  "/logo.jpg",
  "/fonts/cairo-400-arabic.woff2",
  "/fonts/cairo-400-latin.woff2",
  "/fonts/cairo-700-arabic.woff2",
  "/fonts/cairo-700-latin.woff2",
  "/fonts/amiri-400-arabic.woff2",
  "/fonts/amiri-700-arabic.woff2",
];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {})
        )
      )
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for same-origin GETs.
// Navigations fall back to cached "/" when offline so the SPA shell always loads.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((c) => c || caches.match("/"))
        )
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && (res.type === "basic" || res.type === "default")) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
