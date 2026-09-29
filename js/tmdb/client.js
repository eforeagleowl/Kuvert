// Film details from TMDB: poster, runtime, genres (for mood hints), credits and where to stream it.
// Details are bound to a film's permanent id; an ambiguous search asks which film you mean, once.
// Kuvert only talks to TMDB once you've connected your own credential.

export const IMG = "https://image.tmdb.org/t/p/";
// Every TMDB image Kuvert shows or draws, at an address of its own. TMDB only sends its CORS header when
// asked in CORS mode, and lets browsers keep images for a year. Kuvert Classic (now retired) loaded the same
// posters as plain images, and a browser that showed them there still hands its stored copy (no CORS
// header) to Kuvert's CORS request, so the image fails. Classic's copies never had this marker.
export const imageUrl = (size, path) => IMG + size + path + "?cors=1";

export function tmdbAuth(token) {
  const t = (token || "").trim();
  return !t ? null : t.startsWith("eyJ") || t.length > 40 ? { mode: "bearer", t } : { mode: "key", t };
}

export async function tmdb(token, path, params = {}, signal) {
  const a = tmdbAuth(token);
  if (!a) throw Error("Connect TMDB in Settings for movie details.");
  const u = new URL("https://api.themoviedb.org/3" + path);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const headers = {};
  if (a.mode === "bearer") headers.Authorization = "Bearer " + a.t;
  else u.searchParams.set("api_key", a.t);
  const controller = new AbortController(),
    abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(u, { headers, signal: controller.signal });
    if (!r.ok)
      throw Error(
        r.status === 429
          ? "Too many requests. Wait a moment, then try again."
          : r.status === 401
            ? "Your TMDB credential was not accepted. Reconnect in Settings."
            : "Movie details are temporarily unavailable.",
      );
    return await r.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

export function normalized(s) {
  return (s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
export function exactMatch(m, f) {
  return (normalized(m.title) === normalized(f.t) || normalized(m.original_title) === normalized(f.t)) && Number((m.release_date || "").slice(0, 4)) === f.y;
}

export function suggestMoods(genres = []) {
  const names = new Set(genres.map((g) => g.name));
  const tags = [];
  if (names.has("Adventure") || names.has("Fantasy")) tags.push("Adventurous");
  if (names.has("Horror") || names.has("Crime")) tags.push("Dark");
  if (names.has("History") || names.has("War")) tags.push("Epic");
  if (names.has("Comedy")) tags.push("Funny");
  if (names.has("Drama")) tags.push("Reflective");
  if (names.has("Romance")) tags.push("Romantic");
  if (names.has("Thriller") || names.has("Mystery")) tags.push("Tense");
  return tags.slice(0, 3);
}

export class Details {
  /** @param {{ store: import("../state/store.js").Store }} o */
  constructor({ store }) {
    this.store = store;
    this.cache = new Map();
  }
  get token() {
    return this.store.tmdbToken;
  }
  get connected() {
    return !!tmdbAuth(this.token);
  }
  call(path, params, signal) {
    return tmdb(this.token, path, params, signal);
  }
  /**
   * Full details for a film, remembering its match, runtime, poster, mood hints and availability.
   * Resolves to the TMDB movie, { choices } when the match is ambiguous, or { album: true }.
   */
  async fetchInfo(f, signal, { force = false } = {}) {
    const store = this.store,
      region = store.settings.country,
      cacheKey = f.id + ":" + region;
    const fresh = () => {
      const r = store.caches.availability[region]?.[f.id];
      return !!r && Date.now() - r.at < 24 * 60 * 60 * 1000;
    };
    if (!force && this.cache.has(cacheKey) && fresh()) return this.cache.get(cacheKey);
    if (f.kind === "album") {
      store.recordDetails(f.id, { posterPath: null, moods: store.p.moodSuggestions[f.id] || [] });
      return { album: true };
    }
    // Your own choice of match first, then the list's own (js/data/posters.js), then a search.
    const known = store.p.matches[f.id] || store.catalog.tmdbId?.(f.id) || null;
    let id = known;
    if (!id) {
      let s = await this.call("/search/movie", { query: f.t, primary_release_year: f.y, include_adult: false }, signal);
      const exact = (s.results || []).filter((x) => exactMatch(x, f));
      if (exact.length === 1) id = exact[0].id;
      else {
        if (!s.results?.length) s = await this.call("/search/movie", { query: f.t, include_adult: false }, signal);
        return { choices: (s.results || []).slice(0, 6) };
      }
    }
    const d = await this.call("/movie/" + id, { append_to_response: "credits,watch/providers,release_dates" }, signal);
    if (!known && !exactMatch(d, f)) return { choices: [d] };
    if (signal?.aborted || (store.p.matches[f.id] && store.p.matches[f.id] !== id)) throw new DOMException("Aborted", "AbortError");
    const offers = d["watch/providers"]?.results?.[region]?.flatrate || [];
    store.recordDetails(f.id, {
      tmdbId: d.id,
      moods: suggestMoods(d.genres),
      runtime: d.runtime,
      posterPath: typeof d.poster_path === "string" && /^\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/.test(d.poster_path) ? d.poster_path : null,
      region,
      availability:
        d["watch/providers"]?.results && typeof d["watch/providers"].results === "object"
          ? { at: Date.now(), ids: [...new Set(offers.map((p) => p.provider_id).filter((n) => Number.isSafeInteger(n) && n > 0))] }
          : null,
    });
    this.cache.set(cacheKey, d);
    return d;
  }
  async countries() {
    const data = await this.call("/watch/providers/regions", { language: "en-US" });
    if (!Array.isArray(data.results)) return null;
    return data.results.filter((c) => /^[A-Z]{2}$/.test(c.iso_3166_1) && c.english_name).sort((a, b) => a.english_name.localeCompare(b.english_name));
  }
  async providers(region) {
    const data = await this.call("/watch/providers/movie", { watch_region: region, language: "en-US" });
    if (!Array.isArray(data.results)) throw Error("The service list could not be read. Try again.");
    return data.results
      .filter((p) => Number.isSafeInteger(p.provider_id) && p.provider_id > 0 && typeof p.provider_name === "string")
      .map((p) => ({ id: p.provider_id, name: p.provider_name }));
  }
  search(query) {
    return this.call("/search/movie", { query, include_adult: false });
  }
}

export function fmtMoney(n) {
  if (!n) return null;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(n);
}
