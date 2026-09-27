// Kuvert service worker: keeps the app usable offline.
// The page itself is fetched fresh when online (so updates arrive right away) and
// falls back to the cached copy offline. TMDB and GitHub requests are never cached.
// The rebuild under ./next/ has its own worker and cache; this one leaves it alone.
const CACHE = "kuvert-5e1d0c7a42";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("kuvert-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
const BASE = new URL("./", location.href).pathname;
const NEXT = BASE + "next/";
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin === location.origin) {
    if (url.pathname.startsWith(NEXT)) return;
    // Only this app's own page is stored as ./index.html; other pages on the site pass through.
    if (e.request.mode === "navigate" && url.pathname !== BASE && url.pathname !== BASE + "index.html") return;
    if (e.request.mode === "navigate") {
      e.respondWith(
        fetch(e.request)
          .then((r) => {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put("./index.html", copy));
            return r;
          })
          .catch(() => caches.match("./index.html")),
      );
    } else e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
    return;
  }
  // Google Fonts: cache after first use so the typography survives offline.
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname))
    e.respondWith(
      caches.match(e.request).then(
        (hit) =>
          hit ||
          fetch(e.request).then((r) => {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
            return r;
          }),
      ),
    );
});
