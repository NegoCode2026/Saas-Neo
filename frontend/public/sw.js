/* Service worker de StockLocal: cachea el shell para que la app abra sin red.
   - Estáticos de Next (/_next/static): cache-first (inmutables por hash).
   - Navegaciones: network-first con fallback a cache y a /offline.
   - API (otro origen): NO se intercepta; la app maneja offline con su cola.
   Solo se registra en producción (en dev rompería el HMR). */
const CACHE = "stocklocal-v1";
const APP_SHELL = ["/", "/dashboard", "/vender", "/productos", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const mismoOrigen = url.origin === self.location.origin;

  // Payloads RSC de Next y el propio SW: dejar pasar sin cachear
  if (url.searchParams.has("_rsc") || url.pathname === "/sw.js") return;

  // Estáticos de Next: cache-first
  if (mismoOrigen && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        });
      })
    );
    return;
  }

  // Navegaciones: network-first, fallback a cache, luego /offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then((hit) => hit || caches.match("/offline"))
        )
    );
    return;
  }

  // Otros GET del mismo origen: stale-while-revalidate
  if (mismoOrigen) {
    event.respondWith(
      caches.match(request).then((hit) => {
        const red = fetch(request)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          })
          .catch(() => hit);
        return hit || red;
      })
    );
  }
});
