// The poster job (tools/posters.mjs), against a stand-in for TMDB: the film table's entry is used when
// it looks like the film, a search by title and year otherwise, and the last known match as a last resort.
import { test } from "node:test";
import assert from "node:assert/strict";
import { collect, lookUp, postersFile, tmdbClient } from "../../tools/posters.mjs";
import { FILM_TABLE } from "../../js/data/films.js";

const MOVIES = {
  238: { id: 238, title: "The Godfather", original_title: "The Godfather", release_date: "1972-03-14", poster_path: "/godfather.jpg" },
  777: { id: 777, title: "La Grande Illusion", original_title: "La Grande Illusion", release_date: "1937-06-04", poster_path: "/illusion.jpg" },
  901: { id: 901, title: "Somebody Else's Film", original_title: "Somebody Else's Film", release_date: "2011-01-01", poster_path: "/wrong.jpg" },
  902: { id: 902, title: "Lost Reel", original_title: "Lost Reel", release_date: "1931-02-02", poster_path: null },
  903: { id: 903, title: "Second Chance", original_title: "Second Chance", release_date: "1950-05-05", poster_path: "/second.jpg" },
  904: { id: 904, title: "Odd Path", original_title: "Odd Path", release_date: "1960-01-01", poster_path: "https://evil.example/x.jpg" },
};
function fakeTmdb(calls = []) {
  return async (path, params = {}) => {
    calls.push(path);
    if (path.startsWith("/movie/")) return MOVIES[path.slice(7)] || null;
    if (path === "/search/movie") return { results: Object.values(MOVIES).filter((m) => m.title.toLowerCase().includes(String(params.query).toLowerCase())) };
    throw new Error("unexpected " + path);
  };
}

test("the table's TMDB entry is used when it looks like the film, with no search", async () => {
  const calls = [];
  const tmdb = fakeTmdb(calls);
  assert.deepEqual(await lookUp({ id: "1972-the-godfather", t: "The Godfather", y: 1972, tmdb: 238 }, { tmdb }), [238, "/godfather.jpg"]);
  // A different title and a release a year off the list's year still fit: it is the entry Wikidata names.
  assert.deepEqual(await lookUp({ id: "1938-grand-illusion", t: "Grand Illusion", y: 1938, tmdb: 777 }, { tmdb }), [777, "/illusion.jpg"]);
  assert.deepEqual(calls, ["/movie/238", "/movie/777"]);
});

test("an entry that isn't the film is doubted and searched for instead; a missing poster is no poster", async () => {
  const doubts = [];
  const tmdb = fakeTmdb();
  // The table points at somebody else's film: said so, and the search finds the right one.
  assert.deepEqual(await lookUp({ id: "1950-second-chance", t: "Second Chance", y: 1950, tmdb: 901 }, { tmdb, doubts }), [903, "/second.jpg"]);
  assert.match(doubts[0], /Second Chance \(1950\): the table's TMDB entry 901 is "Somebody Else's Film" \(2011\)/);
  assert.equal(await lookUp({ id: "1931-lost-reel", t: "Lost Reel", y: 1931, tmdb: 902 }, { tmdb, doubts }), null, "TMDB has the film but no poster");
  assert.equal(await lookUp({ id: "1960-odd-path", t: "Odd Path", y: 1960, tmdb: 904 }, { tmdb, doubts }), null, "only a plain poster path is ever kept");
  // No entry and nothing found: the match from last time is kept; a pin beats everything.
  assert.deepEqual(await lookUp({ id: "1972-nowhere", t: "Nowhere To Be Found", y: 1972 }, { tmdb, before: { "1972-nowhere": [238, "/old.jpg"] } }), [238, "/godfather.jpg"]);
  assert.deepEqual(await lookUp({ id: "1950-second-chance", t: "Second Chance", y: 1950, tmdb: 901 }, { tmdb, pinned: { "1950-second-chance": 238 } }), [238, "/godfather.jpg"]);
});

test("the whole table goes through, and the file it writes is the one the app reads", async () => {
  const films = [
    { id: "1972-the-godfather", t: "The Godfather", y: 1972, tmdb: 238 },
    { id: "1931-lost-reel", t: "Lost Reel", y: 1931, tmdb: 902 },
    { id: "1950-second-chance", t: "Second Chance", y: 1950, tmdb: 901 },
  ];
  const { found, missing, doubts } = await collect(films, { tmdb: fakeTmdb() });
  assert.deepEqual(found, { "1972-the-godfather": [238, "/godfather.jpg"], "1950-second-chance": [903, "/second.jpg"] });
  assert.deepEqual(missing, ["Lost Reel (1931)"]);
  assert.equal(doubts.length, 1);
  const file = postersFile(found, "2026-11-11");
  const mod = await import("data:text/javascript," + encodeURIComponent(file));
  assert.equal(mod.POSTERS_AT, "2026-11-11");
  assert.deepEqual(mod.POSTERS, found);
  // Every film in the table has an entry to start from.
  assert.ok(Object.values(FILM_TABLE).every((f) => Number.isInteger(f.tmdb) && f.tmdb > 0));
});

test("the client sends the token the way TMDB takes it, waits when told to, and treats a missing film as missing", async () => {
  assert.equal(tmdbClient(""), null);
  const seen = [];
  let busy = 1;
  const fetch = async (url, { headers }) => {
    seen.push([String(url), headers.Authorization || null]);
    if (String(url).includes("/movie/404")) return { ok: false, status: 404 };
    if (busy-- > 0) return { ok: false, status: 429 };
    return { ok: true, json: async () => ({ id: 1 }) };
  };
  const bearer = tmdbClient("eyJ" + "x".repeat(60), { fetch });
  assert.deepEqual(await bearer("/movie/1"), { id: 1 });
  assert.equal(seen.length, 2, "asked again after being told to slow down");
  assert.match(seen[0][1], /^Bearer eyJ/);
  assert.equal(await bearer("/movie/404"), null);
  const key = tmdbClient("abc123", { fetch });
  await key("/movie/2");
  assert.match(seen.at(-1)[0], /api_key=abc123/);
  assert.equal(seen.at(-1)[1], null);
});
