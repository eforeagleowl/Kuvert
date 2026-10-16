import { ApiError, fail } from "./validation.mjs";

const ORIGIN = "https://api.themoviedb.org/3";
const allowed = new Set(["/search/movie", "/watch/providers/movie", "/watch/providers/regions"]);
const language = /^[a-z]{2}(?:-[A-Z]{2})?$/;

/** Fixed upstream and endpoint/parameter allowlists: this never proxies an arbitrary URL. */
export function metadataRequest(path, query) {
  if (!allowed.has(path) && !/^\/movie\/[1-9][0-9]{0,8}$/.test(path)) fail(404, "endpoint_missing", "This movie-data endpoint is not available.");
  const params = new URLSearchParams();
  const keys = path === "/search/movie" ? ["query", "primary_release_year", "include_adult", "language"]
    : path.startsWith("/movie/") ? ["append_to_response", "language"]
      : ["watch_region", "language"];
  for (const key of query.keys()) if (!keys.includes(key)) fail(400, "invalid_input", "Unsupported movie-data parameter.");
  const suppliedKeys = [...query.keys()];
  if (new Set(suppliedKeys).size !== suppliedKeys.length) fail(400, "invalid_input", "Movie-data parameters must not be repeated.");
  const lang = query.get("language") || "en-US";
  if (!language.test(lang)) fail(400, "invalid_input", "Movie-data language is invalid.");
  params.set("language", lang);
  if (path === "/search/movie") {
    const value = query.get("query");
    if (!value?.trim() || value.length > 200) fail(400, "invalid_input", "Search for a film using at most 200 characters.");
    params.set("query", value.trim());
    params.set("include_adult", "false");
    if (query.has("primary_release_year")) {
      const year = query.get("primary_release_year");
      if (!/^[0-9]{4}$/.test(year) || Number(year) < 1888 || Number(year) > 2200) fail(400, "invalid_input", "Movie-data year is invalid.");
      params.set("primary_release_year", year);
    }
  } else if (path.startsWith("/movie/")) {
    if (query.has("append_to_response")) {
      const parts = query.get("append_to_response").split(",");
      if (!parts.length || parts.length > 3 || parts.some((p) => !["credits", "watch/providers", "release_dates"].includes(p))) fail(400, "invalid_input", "Unsupported movie-data addition.");
      params.set("append_to_response", [...new Set(parts)].sort().join(","));
    }
  } else if (query.has("watch_region")) {
    const region = query.get("watch_region");
    if (!/^[A-Z]{2}$/.test(region)) fail(400, "invalid_input", "Movie-data country is invalid.");
    params.set("watch_region", region);
  }
  return { path, params, ttl: path === "/search/movie" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000 };
}

export class MetadataProxy {
  constructor({ token = "", fetchImpl = fetch, now = Date.now, maxEntries = 100 } = {}) {
    this.token = token.trim();
    this.fetchImpl = fetchImpl;
    this.now = now;
    this.maxEntries = maxEntries;
    this.cache = new Map();
    this.pending = new Map();
  }
  get connected() { return !!this.token; }
  async get(path, query = new URLSearchParams()) {
    if (!this.connected) fail(503, "metadata_unconfigured", "Movie data is not connected on this Kuvert service.");
    const request = metadataRequest(path, query);
    const key = request.path + "?" + request.params.toString();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > this.now()) return hit.data;
    if (this.pending.has(key)) return this.pending.get(key);
    if (this.pending.size >= 20) fail(503, "metadata_busy", "Movie details are busy. Please try again in a moment.");
    const operation = this.fetch(request).then((data) => {
      if (this.cache.size >= this.maxEntries) this.cache.delete(this.cache.keys().next().value);
      this.cache.set(key, { data, expiresAt: this.now() + request.ttl });
      return data;
    }).finally(() => this.pending.delete(key));
    this.pending.set(key, operation);
    return operation;
  }
  async fetch({ path, params }) {
    const url = new URL(ORIGIN + path);
    for (const [key, value] of params) url.searchParams.set(key, value);
    const headers = { Accept: "application/json" };
    if (this.token.startsWith("eyJ") || this.token.length > 40) headers.Authorization = "Bearer " + this.token;
    else url.searchParams.set("api_key", this.token);
    try {
      const response = await this.fetchImpl(url, { headers, signal: AbortSignal.timeout(15000), redirect: "error" });
      if (!response.ok) fail(response.status === 429 ? 429 : 502, "metadata_upstream", "Movie details are temporarily unavailable. Please try again later.");
      if (Number(response.headers.get("content-length")) > 2 * 1024 * 1024) throw Error("Large upstream response");
      let raw;
      if (response.body?.getReader) {
        const reader = response.body.getReader();
        const parts = [];
        let size = 0;
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 2 * 1024 * 1024) { await reader.cancel(); throw Error("Large upstream response"); }
            parts.push(Buffer.from(value));
          }
        } finally { reader.releaseLock(); }
        raw = Buffer.concat(parts).toString("utf8");
      } else raw = await response.text();
      if (Buffer.byteLength(raw) > 2 * 1024 * 1024) throw Error("Large upstream response");
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw Error("Invalid upstream response");
      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      fail(502, "metadata_upstream", "Movie details are temporarily unavailable. Please try again later.");
    }
  }
}
