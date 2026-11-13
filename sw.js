// Kuvert's service worker: the whole app works offline after the first visit.
//
// Every file is precached under one version. tools/stamp.mjs writes VERSION and FILES from the
// files' contents, so any change to the app changes this file, and browsers pick up the update.
// The page and its scripts and styles always come from that one version: a release never pairs a
// new page with old scripts. The new version is fetched in the background and takes over once it
// is complete; the page then reloads itself or offers to (js/main.js, js/update.js). The file is
// small on purpose: no libraries, and nothing but the app and its posters is ever cached.

// <stamp> written by tools/stamp.mjs (npm run stamp); do not edit by hand.
const VERSION = "4a0e3533cb7c";
const FILES = [
  "./",
  "./manifest.webmanifest",
  "./css/404.css",
  "./css/base.css",
  "./css/components.css",
  "./css/fonts.css",
  "./css/journeys.css",
  "./css/pages.css",
  "./css/seagal.css",
  "./css/station.css",
  "./css/tokens.css",
  "./css/tonight.css",
  "./js/boot.js",
  "./js/club/client.js",
  "./js/club/service.js",
  "./js/compat/codes.js",
  "./js/compat/keys.js",
  "./js/compat/legacy-code.js",
  "./js/compat/legacy-ids.js",
  "./js/compat/serialize.js",
  "./js/compat/validate.js",
  "./js/data/award-lists.js",
  "./js/data/awards.js",
  "./js/data/bafta.js",
  "./js/data/basics.js",
  "./js/data/catalogue.js",
  "./js/data/ceremonies.js",
  "./js/data/curated.js",
  "./js/data/films.js",
  "./js/data/lists.js",
  "./js/data/posters.js",
  "./js/data/premises-en.js",
  "./js/data/premises-sv.js",
  "./js/fun/gala.js",
  "./js/fun/seagal.js",
  "./js/i18n/index.js",
  "./js/i18n/journeys.js",
  "./js/i18n/premises.js",
  "./js/i18n/sv.js",
  "./js/i18n/titles-sv.js",
  "./js/i18n/titles.js",
  "./js/import/importers.js",
  "./js/journeys/invitations.js",
  "./js/journeys/passport.js",
  "./js/journeys/qr.js",
  "./js/main.js",
  "./js/share/images.js",
  "./js/state/catalog.js",
  "./js/state/dates.js",
  "./js/state/draw.js",
  "./js/state/group.js",
  "./js/state/merge.js",
  "./js/state/shared.js",
  "./js/state/stats.js",
  "./js/state/store.js",
  "./js/station/audio.js",
  "./js/station/flaps.js",
  "./js/station/stations.js",
  "./js/station/timetable.js",
  "./js/storage/files.js",
  "./js/storage/library-backup.js",
  "./js/storage/safekeeping.js",
  "./js/storage/sync.js",
  "./js/tmdb/client.js",
  "./js/ui/dialogs.js",
  "./js/ui/dom.js",
  "./js/ui/horse.js",
  "./js/ui/install.js",
  "./js/ui/sounds.js",
  "./js/ui/stars.js",
  "./js/ui/toast.js",
  "./js/update.js",
  "./js/vendor/QRCODE-LICENSE.txt",
  "./js/vendor/qrcode.js",
  "./js/views/club.js",
  "./js/views/evening.js",
  "./js/views/group.js",
  "./js/views/journeys.js",
  "./js/views/library.js",
  "./js/views/nixie.js",
  "./js/views/rails.js",
  "./js/views/settings.js",
  "./js/views/stage.js",
  "./js/views/station.js",
  "./js/views/stats.js",
  "./assets/crowns.svg",
  "./assets/fonts/courier-prime-400-latin-ext.woff2",
  "./assets/fonts/courier-prime-400-latin.woff2",
  "./assets/fonts/courier-prime-700-latin-ext.woff2",
  "./assets/fonts/courier-prime-700-latin.woff2",
  "./assets/fonts/familjen-400-700-latin-ext.woff2",
  "./assets/fonts/familjen-400-700-latin.woff2",
  "./assets/fonts/geist-arrows.woff2",
  "./assets/fonts/michroma-400-latin-ext.woff2",
  "./assets/fonts/michroma-400-latin.woff2",
  "./assets/fonts/noto-symbols-2-marks.woff2",
  "./assets/fonts/playfair-400-900-italic-latin-ext.woff2",
  "./assets/fonts/playfair-400-900-italic-latin.woff2",
  "./assets/fonts/playfair-400-900-latin-ext.woff2",
  "./assets/fonts/playfair-400-900-latin.woff2",
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
// These names avoid "kuvert-": Kuvert Classic's worker cleared every cache with that prefix.
// Left behind by older layouts: Kuvert Classic's caches (from the root, and from ./classic/ before it
// retired) and the rebuild's from when it lived in ./next/.
const RETIRED = (k) => /^kuvert-[0-9a-f]{10}$/.test(k) || k.startsWith("kuvert-classic-") || k.startsWith("kvnext-");
// ./classic/ and ./next/ only forward here now, each with a worker that removes itself.
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
  if (url.pathname.startsWith(BASE + "api/") || url.pathname.startsWith("/api/")) return;

  if (url.origin === location.origin) {
    if (ELSEWHERE.some((p) => url.pathname.startsWith(p))) return;
    if (req.mode === "navigate") e.respondWith(page(req, url));
    else e.respondWith(own(req).then((hit) => hit || fetch(req)));
    return;
  }
  // Posters and stills from TMDB: kept once seen, so the poster wall survives offline.
  if (url.hostname === "image.tmdb.org") e.respondWith(poster(req));
  // Everything else (the TMDB API, GitHub sync) always goes to the network.
});

// This version's copy of a file, whatever its query string.
const own = (req) =>
  caches
    .open(CACHE)
    .then((c) => c.match(req, { ignoreSearch: true }))
    .catch(() => undefined);
const SHELL = new URL("./", self.registration.scope).href;

// The app's page comes from this version's cache, like its scripts. Any other page (the site's 404
// page) is fetched fresh and kept under its own address; offline, the stored copy or the app's page.
async function page(req, url) {
  const key = url.origin + url.pathname;
  const app = key === SHELL || key === SHELL + "index.html";
  const shell = app ? await own(SHELL) : null;
  if (shell) return shell;
  try {
    const res = await fetch(req);
    if (res.ok && !app) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(key, copy));
    }
    return res;
  } catch (err) {
    const hit = (await own(key)) || (await own(SHELL));
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
