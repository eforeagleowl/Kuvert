// Kuvert's service worker: the whole app works offline after the first visit.
//
// Every file is precached under one version. tools/stamp.mjs writes VERSION and FILES from the
// files' contents, so any change to the app changes this file, and browsers pick up the update.
// Pages are fetched fresh when online and stored under their own URL. The file is small on
// purpose: no libraries, and nothing but the app and its posters is ever cached.

// <stamp> written by tools/stamp.mjs (npm run stamp); do not edit by hand.
const VERSION = "0af4cb601774";
const FILES = [
  "./",
  "./manifest.webmanifest",
  "./css/base.css",
  "./css/components.css",
  "./css/fonts.css",
  "./css/pages.css",
  "./css/seagal.css",
  "./css/tokens.css",
  "./css/tonight.css",
  "./js/boot.js",
  "./js/compat/codes.js",
  "./js/compat/keys.js",
  "./js/compat/legacy-code.js",
  "./js/compat/legacy-ids.js",
  "./js/compat/serialize.js",
  "./js/compat/validate.js",
  "./js/data/catalogue.js",
  "./js/data/lists.js",
  "./js/fun/seagal.js",
  "./js/import/importers.js",
  "./js/main.js",
  "./js/share/images.js",
  "./js/state/catalog.js",
  "./js/state/dates.js",
  "./js/state/draw.js",
  "./js/state/group.js",
  "./js/state/merge.js",
  "./js/state/stats.js",
  "./js/state/store.js",
  "./js/storage/files.js",
  "./js/storage/safekeeping.js",
  "./js/storage/sync.js",
  "./js/tmdb/client.js",
  "./js/ui/dialogs.js",
  "./js/ui/dom.js",
  "./js/ui/horse.js",
  "./js/ui/sounds.js",
  "./js/ui/stars.js",
  "./js/ui/toast.js",
  "./js/views/evening.js",
  "./js/views/group.js",
  "./js/views/library.js",
  "./js/views/nixie.js",
  "./js/views/rails.js",
  "./js/views/settings.js",
  "./js/views/stage.js",
  "./js/views/stats.js",
  "./assets/crowns.svg",
  "./assets/fonts/cormorant-500-700-italic-latin-ext.woff2",
  "./assets/fonts/cormorant-500-700-italic-latin.woff2",
  "./assets/fonts/cormorant-600-700-latin-ext.woff2",
  "./assets/fonts/cormorant-600-700-latin.woff2",
  "./assets/fonts/geist-400-700-latin-ext.woff2",
  "./assets/fonts/geist-400-700-latin.woff2",
  "./assets/fonts/geist-arrows.woff2",
  "./assets/fonts/geist-mono-400-600-latin-ext.woff2",
  "./assets/fonts/geist-mono-400-600-latin.woff2",
  "./assets/fonts/michroma-400-latin-ext.woff2",
  "./assets/fonts/michroma-400-latin.woff2",
  "./assets/fonts/noto-symbols-2-marks.woff2",
  "./assets/paper.webp",
  "./assets/tmdb.svg",
  "./favicon.svg",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
];
// </stamp>

const CACHE = "kvapp-" + VERSION;
const POSTERS = "kvapp-posters-2"; // -2: addresses carry ?cors=1, so the old entries were never used again
const POSTER_LIMIT = 600;
// The classic app's worker clears caches named "kuvert-*", so these names avoid that prefix.
// Left behind by the old layout: the classic app's caches from when it lived here, and the
// rebuild's from when it lived in ./next/.
const RETIRED = (k) => /^kuvert-[0-9a-f]{10}$/.test(k) || k.startsWith("kvnext-");
// Kuvert Classic has its own worker in ./classic/; ./next/ only forwards here.
const BASE = new URL("./", self.registration.scope).pathname;
const ELSEWHERE = [BASE + "classic/", BASE + "next/"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => RETIRED(k) || (k.startsWith("kvapp-") && k !== CACHE && k !== POSTERS)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    if (ELSEWHERE.some((p) => url.pathname.startsWith(p))) return;
    if (req.mode === "navigate") e.respondWith(page(req, url));
    else e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
    return;
  }
  // Posters and stills from TMDB: kept once seen, so the poster wall survives offline.
  if (url.hostname === "image.tmdb.org") e.respondWith(poster(req));
  // Everything else (the TMDB API, GitHub sync) always goes to the network.
});

// Network first; offline, the stored copy of this page (or the app's main page).
async function page(req, url) {
  const key = url.origin + url.pathname;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(key, copy));
    }
    return res;
  } catch (err) {
    const hit = (await caches.match(key)) || (await caches.match(new URL("./", self.registration.scope).href)) || (await caches.match(new URL("./index.html", self.registration.scope).href));
    if (hit) return hit;
    throw err;
  }
}

// Poster sizes only: backdrops and full-size lightbox images are large and fetched fresh each time.
const KEEP = /\/t\/p\/w(92|154|185|342|500)\//;
async function poster(req) {
  const keep = KEEP.test(new URL(req.url).pathname);
  let cache = null;
  try {
    cache = keep ? await caches.open(POSTERS) : null;
    const hit = await cache?.match(req);
    if (hit) return hit;
  } catch {}
  const res = await fetch(req);
  // Stored in the background, and a full or unavailable cache never costs the image itself.
  // CORS responses only: opaque ones can't be checked and cost browsers megabytes of quota each.
  if (res.ok && cache)
    cache
      .put(req, res.clone())
      .then(() => trim(cache))
      .catch(() => {});
  return res;
}

// Oldest first, once the cache passes its limit.
async function trim(cache) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - POSTER_LIMIT))) await cache.delete(k);
}
