// Offline-first Service Worker for // Offline-first Service Worker for اللواء 35 مشاة
// Strategy:
//  - Precache the app shell (HTML routes + manifest + icons + fonts).
//  - Cache-first for static assets (JS/CSS/fonts/images) so the app boots
//    instantly with zero network once installed.
//  - Network-first with cache fallback for HTML navigations so updates
//    are picked up when online, but the SPA shell still loads offline.
const CACHE_NAME = "soqour-v5";
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
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
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
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

function isStaticAsset(url) {
  return /\.(?:js|mjs|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|webp|ico|json)$/i.test(
    url.pathname
  );
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // SPA navigations: network-first, fallback to cached shell so the app
  // always loads while offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((c) => c || caches.match("/") || caches.match("/login"))
        )
    );
    return;
  }

  // Static assets (JS/CSS/fonts/images): cache-first for instant offline boot,
  // and lazily refresh from the network in the background.
  if (isStaticAsset(url)) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(req, clone)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Everything else: stale-while-revalidate.
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
