// Fetches a TMDB match and poster for every film on the built-in list and writes js/data/posters.js,
// so everyone sees posters without a TMDB key of their own. Kuvert uses them for six months at most
// (TMDB's terms), so this runs every month: the "Refresh posters" workflow (.github/workflows/posters.yml).
//
//   TMDB_TOKEN=<API read access token or API key> node tools/posters.mjs
//
// A film matches when TMDB has exactly one film of that title from that year (the same rule as the app).
// Otherwise the match it had before is kept. Films it can't match are listed at the end: they keep no
// poster until one is pinned in PINNED below.
import { writeFileSync } from "node:fs";
import { FILMS } from "../js/data/catalogue.js";
import { POSTERS as BEFORE } from "../js/data/posters.js";
import { tmdbAuth, exactMatch, normalized } from "../js/tmdb/client.js";

// Films whose TMDB match can't be found from the title and year alone: film id → TMDB id.
const PINNED = {};

const auth = tmdbAuth(process.env.TMDB_TOKEN);
if (!auth) {
  console.error("Set TMDB_TOKEN to a TMDB API read access token (or API key). In the workflow it comes from the TMDB_TOKEN repository secret.");
  process.exit(1);
}
const POSTER = /^\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function tmdb(path, params = {}) {
  const u = new URL("https://api.themoviedb.org/3" + path);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const headers = { Accept: "application/json" };
  if (auth.mode === "bearer") headers.Authorization = "Bearer " + auth.t;
  else u.searchParams.set("api_key", auth.t);
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(u, { headers });
    if (r.ok) return r.json();
    if (r.status === 401) throw Error("TMDB didn't accept TMDB_TOKEN.");
    if ((r.status === 429 || r.status >= 500) && attempt < 5) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    throw Error("TMDB answered " + r.status + " for " + path);
  }
}

// One film: its TMDB id and poster, or null.
async function lookUp(f) {
  let id = PINNED[f.id] || null;
  let poster;
  if (!id) {
    const s = await tmdb("/search/movie", { query: f.t, primary_release_year: f.y, include_adult: false });
    const results = s.results || [];
    let hits = results.filter((x) => exactMatch(x, f));
    // Release dates sometimes sit a year either side of the list's year (festival premieres, late releases).
    if (!hits.length) hits = results.filter((x) => normalized(x.title) === normalized(f.t) && Math.abs(Number((x.release_date || "").slice(0, 4)) - f.y) <= 1);
    if (hits.length === 1) [id, poster] = [hits[0].id, hits[0].poster_path];
    else if (BEFORE[f.id]) id = BEFORE[f.id][0];
  }
  if (!id) return null;
  if (poster === undefined) poster = (await tmdb("/movie/" + id)).poster_path;
  return typeof poster === "string" && POSTER.test(poster) ? [id, poster] : null;
}

const films = FILMS.filter((f) => f.kind !== "album");
const found = {},
  missing = [];
let next = 0;
// Four at a time: well inside TMDB's rate limit.
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < films.length) {
      const f = films[next++];
      const r = await lookUp(f);
      if (r) found[f.id] = r;
      else missing.push(f.t + " (" + f.y + ")");
    }
  }),
);

const at = new Date().toISOString().slice(0, 10);
const ids = Object.keys(found).sort();
writeFileSync(
  new URL("../js/data/posters.js", import.meta.url),
  `// Posters for the built-in list, from TMDB, so everyone sees them without a TMDB key of their own.
// Written by tools/posters.mjs; the "Refresh posters" workflow runs it every month. TMDB's terms allow
// keeping its data for six months, so Kuvert stops using these once they're older than that.
export const POSTERS_AT = ${JSON.stringify(at)}; // the day they were fetched, "YYYY-MM-DD"
// film id → [TMDB id, poster path]
export const POSTERS = {
${ids.map((id) => "  " + JSON.stringify(id) + ": " + JSON.stringify(found[id]) + ",").join("\n")}
};
`,
);
console.log(`Posters for ${ids.length} of ${films.length} films, fetched ${at}.`);
if (missing.length) console.log("No match or no poster (pin these in tools/posters.mjs):\n  " + missing.sort().join("\n  "));
