// Fetches a poster for every film in the film table (js/data/films.js) and writes js/data/posters.js,
// so everyone sees posters without a TMDB key of their own, in every list. Kuvert uses them for six
// months at most (TMDB's terms), so this runs every month: the "Refresh posters" workflow
// (.github/workflows/posters.yml).
//
//   TMDB_TOKEN=<API read access token or API key> node tools/posters.mjs
//
// A film's TMDB entry is the one the table names (`tmdb`, Wikidata's own statement). Before its poster
// is used the entry has to look like the film: the same title, or a release within a year of the film's.
// A film with no entry, or with one that doesn't fit, is searched for by title and year: it matches
// when TMDB has exactly one film of that title from that year (the same rule as the app). Otherwise
// the match it had before is kept. Films left without a poster are listed at the end, to pin in PINNED.
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { FILM_TABLE } from "../js/data/films.js";
import { POSTERS as BEFORE } from "../js/data/posters.js";
import { tmdbAuth, exactMatch, normalized } from "../js/tmdb/client.js";

// Films whose TMDB entry is neither in the table nor found by title and year: film id → TMDB id.
const PINNED = {};

const POSTER = /^\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const yearOf = (m) => Number((m.release_date || "").slice(0, 4));

/** TMDB's API with this token: tmdb("/movie/603") → the JSON. Waits and retries when asked to slow down. */
export function tmdbClient(token, { fetch = globalThis.fetch } = {}) {
  const auth = tmdbAuth(token);
  if (!auth) return null;
  return async function tmdb(path, params = {}) {
    const u = new URL("https://api.themoviedb.org/3" + path);
    for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
    const headers = { Accept: "application/json" };
    if (auth.mode === "bearer") headers.Authorization = "Bearer " + auth.t;
    else u.searchParams.set("api_key", auth.t);
    for (let attempt = 0; ; attempt++) {
      const r = await fetch(u, { headers });
      if (r.ok) return r.json();
      if (r.status === 401) throw Error("TMDB didn't accept TMDB_TOKEN.");
      if (r.status === 404) return null;
      if ((r.status === 429 || r.status >= 500) && attempt < 5) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      throw Error("TMDB answered " + r.status + " for " + path);
    }
  };
}

/**
 * One film ({ id, t, y, tmdb? }): its TMDB id and poster, or null. `doubts` collects table entries that
 * didn't look like their film.
 */
export async function lookUp(f, { tmdb, before = {}, pinned = {}, doubts = [] }) {
  const usable = (m) => (m && typeof m.poster_path === "string" && POSTER.test(m.poster_path) ? [m.id, m.poster_path] : null);
  if (pinned[f.id]) return usable(await tmdb("/movie/" + pinned[f.id]));
  if (f.tmdb) {
    const m = await tmdb("/movie/" + f.tmdb);
    const fits = m && (Math.abs(yearOf(m) - f.y) <= 1 || [m.title, m.original_title].some((x) => normalized(x) === normalized(f.t)));
    if (fits) return usable(m);
    doubts.push(`${f.t} (${f.y}): the table's TMDB entry ${f.tmdb} is ${m ? `"${m.title}" (${yearOf(m) || "no date"})` : "gone"}`);
  }
  const results = (await tmdb("/search/movie", { query: f.t, primary_release_year: f.y, include_adult: false }))?.results || [];
  let hits = results.filter((x) => exactMatch(x, f));
  // Release dates sometimes sit a year either side of the list's year (festival premieres, late releases).
  if (!hits.length) hits = results.filter((x) => normalized(x.title) === normalized(f.t) && Math.abs(yearOf(x) - f.y) <= 1);
  if (hits.length === 1) return usable(hits[0]);
  return before[f.id] ? usable(await tmdb("/movie/" + before[f.id][0])) : null;
}

/** Every film's poster: { found: { id: [tmdbId, path] }, missing: [...], doubts: [...] }. Four at a time. */
export async function collect(films, options) {
  const found = {},
    missing = [],
    doubts = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < films.length) {
        const f = films[next++];
        const r = await lookUp(f, { ...options, doubts });
        if (r) found[f.id] = r;
        else missing.push(f.t + " (" + f.y + ")");
      }
    }),
  );
  return { found, missing: missing.sort(), doubts: doubts.sort() };
}

export function postersFile(found, at) {
  return `// Posters for every film Kuvert ships, from TMDB, so everyone sees them without a TMDB key of their own.
// Written by tools/posters.mjs; the "Refresh posters" workflow runs it every month. TMDB's terms allow
// keeping its data for six months, so Kuvert stops using these once they're older than that.
export const POSTERS_AT = ${JSON.stringify(at)}; // the day they were fetched, "YYYY-MM-DD"
// film id → [TMDB id, poster path]
export const POSTERS = {
${Object.keys(found)
  .sort()
  .map((id) => "  " + JSON.stringify(id) + ": " + JSON.stringify(found[id]) + ",")
  .join("\n")}
};
`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const tmdb = tmdbClient(process.env.TMDB_TOKEN);
  if (!tmdb) {
    console.error("Set TMDB_TOKEN to a TMDB API read access token (or API key). In the workflow it comes from the TMDB_TOKEN repository secret.");
    process.exit(1);
  }
  const films = Object.entries(FILM_TABLE).map(([id, f]) => ({ id, t: f.t, y: f.y, tmdb: f.tmdb }));
  const { found, missing, doubts } = await collect(films, { tmdb, before: BEFORE, pinned: PINNED });
  const at = new Date().toISOString().slice(0, 10);
  writeFileSync(new URL("../js/data/posters.js", import.meta.url), postersFile(found, at));
  console.log(`Posters for ${Object.keys(found).length} of ${films.length} films, fetched ${at}.`);
  if (doubts.length) console.log("Table entries that didn't look like their film (fix `tmdb` in js/data/films.js):\n  " + doubts.join("\n  "));
  if (missing.length) console.log("No match or no poster (pin these in tools/posters.mjs):\n  " + missing.join("\n  "));
}
