// The state model: loading the original app's browser save, the draw rules, watching, undo, merging.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildListDefinition, resolveList } from "../../js/data/lists.js";
import { computeMilestones } from "../../js/state/stats.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { Store } from "../../js/state/store.js";
import { bySync, keepLocal, emptyProgress } from "../../js/state/merge.js";
import { defaultWatchDate } from "../../js/state/dates.js";
import { LOCAL_LEGACY_IDS } from "../../js/compat/legacy-ids.js";
import { MemoryStorage } from "./helpers.mjs";

const golden = JSON.parse(readFileSync(new URL("../fixtures/golden.json", import.meta.url), "utf8"));

function makeStore(entries = {}, now = () => new Date("2026-09-26T20:00:00")) {
  const storage = new MemoryStorage(entries);
  const list = resolveList(storage);
  const store = new Store({ list, catalog: makeCatalog(list), storage, now });
  assert.equal(store.load(), null);
  return store;
}

test("reads the original app's browser save and writes the same progress back", () => {
  const store = makeStore({ "kuvert:v4": golden.builtin.full.browser });
  assert.equal(JSON.stringify(store.data()), JSON.stringify(golden.builtin.full.data));
  assert.equal(store.settings.country, "SE");
  assert.equal(store.settings.query, "godfather");
  assert.equal(store.settings.wallSort, "rank");
  assert.equal(store.settings.runtimeLimit, 120);
  assert.deepEqual(store.settings.selectedServices, { SE: [8, 337] });
  assert.deepEqual(store.caches.availability, {}, "stale availability is dropped, as in the original");
  store.persist();
  const written = JSON.parse(store.storage.getItem("kuvert:v4"));
  const original = JSON.parse(golden.builtin.full.browser);
  assert.deepEqual({ ...written, availability: null, providerDirectories: null }, { ...original, availability: null, providerDirectories: null });
});

test("moves the first app's browser save to kuvert:v4", () => {
  const seen = LOCAL_LEGACY_IDS.slice(0, 7).map((_, i) => i);
  const store = makeStore({ "envelope:v1": JSON.stringify({ seen, dates: { 2: "2024-05-06" } }) });
  assert.equal(store.p.seen.size, 7);
  assert.equal(store.p.dates[LOCAL_LEGACY_IDS[2]], "2024-05-06");
  assert.ok(store.storage.getItem("kuvert:v4"), "written under the new key");
});

test("a series is one ticket and plays in order", () => {
  const store = makeStore();
  const units = store.units();
  const lotr = units.filter((u) => u.series === "lotr");
  assert.equal(lotr.length, 1);
  assert.equal(lotr[0].film.id, "2001-the-lord-of-the-rings-the-fellowship-of-the-ring");
  store.markSeen("2001-the-lord-of-the-rings-the-fellowship-of-the-ring", true);
  assert.equal(store.units().find((u) => u.series === "lotr").film.ord, 2);
});

test("watching tonight's series film puts the next part on the ticket", () => {
  const store = makeStore();
  store.pick("1972-the-godfather");
  const r = store.markSeen("1972-the-godfather", true);
  assert.equal(r.next.id, "1974-the-godfather-part-ii");
  assert.equal(store.p.current, "1974-the-godfather-part-ii");
  assert.equal(store.p.dates["1972-the-godfather"], "2026-09-26");
  assert.deepEqual(r.earned.map((c) => c.id), ["watched-1"]);
});

test("draw again never repeats the ticket, and says so when nothing else fits", () => {
  const store = makeStore();
  store.draw(() => 0);
  for (let i = 0; i < 50; i++) {
    const before = store.p.current;
    assert.notEqual(store.draw(Math.random).film.id, before);
  }
  // Only one film left: drawing again reports it.
  const store2 = makeStore();
  const keep = store2.catalog.films.find((f) => !f.tri);
  for (const f of store2.catalog.films) if (f.id !== keep.id) store2.p.seen.add(f.id);
  store2.pick(keep.id);
  assert.equal(store2.draw().reason, "only");
});

test("set-aside films leave the draw, one at a time", () => {
  const store = makeStore();
  store.pick("1927-wings");
  assert.ok(store.skipCurrent().undo);
  assert.ok(store.p.skipped.has("1927-wings"));
  assert.ok(!store.units().some((u) => u.film.id === "1927-wings"));
  store.pick("1929-the-broadway-melody");
  assert.equal(store.skipCurrent().reason, "busy");
});

test("evenings end at four in the morning", () => {
  assert.equal(defaultWatchDate(new Date("2026-09-27T01:30:00")), "2026-09-26");
  assert.equal(defaultWatchDate(new Date("2026-09-27T04:00:00")), "2026-09-27");
});

test("undo puts everything back", () => {
  const store = makeStore();
  const r = store.markSeen("1942-casablanca", true);
  store.rate("1942-casablanca", 4.5);
  store.undo(r.undo);
  assert.ok(!store.p.seen.has("1942-casablanca"));
  assert.equal(store.p.reviews["1942-casablanca"], undefined);
});

test("time preferences filter by runtime and finish time", () => {
  const store = makeStore({}, () => new Date("2026-09-26T20:00:00"));
  store.p.runtimes["1927-wings"] = 141;
  store.p.runtimes["1942-casablanca"] = 102;
  store.setTimeMode("120");
  const ids = store.units().map((u) => u.film.id);
  assert.ok(ids.includes("1942-casablanca") && !ids.includes("1927-wings"));
  store.setFinishTime("22:00");
  assert.equal(store.settings.timeMode, "finish");
  assert.deepEqual(store.units().map((u) => u.film.id), ["1942-casablanca"]);
});

test("the Oscar line names who a film beat or lost to", () => {
  const { catalog } = makeStore();
  assert.equal(catalog.oscarLine(catalog.byId.get("1976-taxi-driver")), "Lost to Rocky at the 49th Academy Awards.");
  assert.match(catalog.oscarLine(catalog.byId.get("1976-rocky")), /^Beat .*Taxi Driver.* at the 49th Academy Awards\.$/);
});

test("a list's award names the prize, the ceremony and the trophy; a list without one gets plain words", () => {
  const store = makeStore(),
    { catalog } = store;
  assert.equal(catalog.prize, "Best Picture");
  assert.equal(catalog.award.trophy, "Oscar");
  assert.equal(catalog.award.field(49), 5);
  assert.equal(computeMilestones(store.p, catalog).find((m) => m.id === "winners").description, "Watch ten Best Picture winners.");
  // An imported list with winners and ceremonies of its own follows no award.
  const rows = [{ title: "Alpha", year: 2001, shelf: "W", ceremony: 3 }, { title: "Beta", year: 2001, shelf: "N", ceremony: 3 }];
  const own = makeCatalog({ ...resolveList(new MemoryStorage()), ...buildListDefinition({ name: "Mine", films: rows, id: "mine" }), custom: true, award: null });
  assert.equal(own.award, null);
  assert.equal(own.prize, null);
  assert.equal(own.oscarLine(own.byId.get("2001-beta")), "Lost to Alpha at the 3rd ceremony.");
  assert.equal(own.oscarLine(own.byId.get("2001-alpha")), "Beat Beta at the 3rd ceremony.");
  // A list that names its award gets that award's words; the definition carries the name, and only a known shape.
  assert.equal(buildListDefinition({ name: "Ballots", films: rows, id: "b", award: "oscars" }).award, "oscars");
  assert.equal("award" in buildListDefinition({ name: "Ballots", films: rows, id: "b", award: "<script>" }), false);
  const followed = makeCatalog({ ...resolveList(new MemoryStorage()), ...buildListDefinition({ name: "Ballots", films: rows, id: "b", award: "oscars" }), custom: true });
  assert.equal(followed.oscarLine(followed.byId.get("2001-beta")), "Lost to Alpha at the 3rd Academy Awards.");
});

test("forgiving search finds nicknames, numerals and initials", () => {
  const { catalog } = makeStore();
  const find = (q) => catalog.films.filter((f) => catalog.matchesSearch(f, q)).map((f) => f.id);
  assert.ok(find("lotr").length === 3);
  assert.deepEqual(find("lotr2"), ["2002-the-lord-of-the-rings-the-two-towers"]);
  assert.ok(find("godfather 2").includes("1974-the-godfather-part-ii"));
  assert.ok(find("et").includes("1982-e-t-the-extra-terrestrial"));
  assert.ok(find("zola 1937").includes("1937-the-life-of-emile-zola"));
});

// ---------------------------------------------------------------- sync merging
function progress(fill) {
  const p = emptyProgress();
  fill(p);
  return p;
}
test("sync: un-marking a film on one device sticks when both changed", () => {
  const local = progress((p) => {
    p.seen = new Set(["a", "b"]);
    p.dates = { a: "2026-01-01", b: "2026-01-02" };
    p.stamps = { b: "2026-01-02T20:00:00Z" };
  });
  const remote = progress((p) => {
    p.seen = new Set(["a"]); // b un-marked later on the other device
    p.dates = { a: "2026-01-01" };
    p.stamps = { b: "2026-01-05T20:00:00Z" };
  });
  const out = bySync(local, remote);
  assert.deepEqual([...out.seen].sort(), ["a"]);
  assert.equal(out.dates.b, undefined);
  // The original app's merge would bring it back:
  assert.deepEqual([...keepLocal(remote, local).seen].sort(), ["a", "b"]);
});
test("sync: the newest rating wins, films without change times combine", () => {
  const local = progress((p) => {
    p.seen = new Set(["a", "x"]);
    p.reviews = { a: { note: "", rating: 2 } };
    p.stamps = { a: "2026-01-01T00:00:00Z" };
  });
  const remote = progress((p) => {
    p.seen = new Set(["a", "y"]);
    p.reviews = { a: { note: "better second time", rating: 4 } };
    p.shelf = new Set(["z"]);
    p.stamps = { a: "2026-02-01T00:00:00Z" };
  });
  const out = bySync(local, remote);
  assert.deepEqual(out.reviews.a, { note: "better second time", rating: 4 });
  assert.deepEqual([...out.seen].sort(), ["a", "x", "y"]);
  assert.deepEqual([...out.shelf], ["z"]);
  assert.equal(out.stamps.a, "2026-02-01T00:00:00Z");
});
test("sync: tonight's ticket and the ranking follow the newest change", () => {
  const local = progress((p) => {
    p.seen = new Set(["a", "b"]);
    p.current = "c";
    p.drawnOn = "2026-01-01";
    p.rankings = ["a", "b"];
    p.stamps = { $current: "2026-01-01T00:00:00Z", $ranking: "2026-03-01T00:00:00Z" };
  });
  const remote = progress((p) => {
    p.seen = new Set(["a", "b"]);
    p.current = "d";
    p.drawnOn = "2026-02-01";
    p.rankings = ["b", "a"];
    p.stamps = { $current: "2026-02-01T00:00:00Z", $ranking: "2026-02-01T00:00:00Z" };
  });
  const out = bySync(local, remote);
  assert.equal(out.current, "d");
  assert.deepEqual(out.rankings, ["a", "b"]);
});

test("Kuvert's own posters: used while fresh, in every list that has the film, and your own match first", async () => {
  const { freshPosters } = await import("../../js/state/catalog.js");
  const posters = { "1959-ben-hur": [665, "/benhur.jpg"] };
  const now = new Date("2026-10-01T12:00:00Z");
  assert.equal(freshPosters(posters, "2026-09-29", now), posters);
  assert.deepEqual(freshPosters(posters, "2026-03-01", now), {}, "older than six months: not used");
  assert.deepEqual(freshPosters(posters, null, now), {});
  const storage = new MemoryStorage();
  const list = resolveList(storage);
  const catalog = makeCatalog(list, { posters });
  const store = new Store({ list, catalog, storage, now: () => now });
  store.load();
  assert.equal(catalog.hasPosters, true);
  assert.equal(catalog.tmdbId("1959-ben-hur"), 665);
  assert.equal(store.posterPath("1959-ben-hur"), "/benhur.jpg");
  assert.equal(store.posterPath("1972-the-godfather"), undefined);
  store.recordDetails("1959-ben-hur", { posterPath: "/mine.jpg" });
  assert.equal(store.posterPath("1959-ben-hur"), "/mine.jpg", "your own lookup wins");
  // Posters and TMDB entries go by film id, like Swedish titles: any list with the film has them.
  const custom = makeCatalog({ id: "mine", custom: true, name: "Mine", films: [{ t: "Ben-Hur", y: 1959, id: "1959-ben-hur" }, { t: "My Home Movie", y: 2020, id: "2020-my-home-movie" }] }, { posters });
  assert.equal(custom.poster("1959-ben-hur"), "/benhur.jpg");
  assert.equal(custom.hasPosters, true);
  assert.equal(custom.poster("2020-my-home-movie"), null);
  assert.equal(custom.tmdbId("2020-my-home-movie"), null, "a film Kuvert doesn't ship has no entry to offer");
  // Before the poster job has run there is nothing to offer: the film table's TMDB entries are the job's
  // starting point, and only an entry it has checked reaches the app.
  const bare = makeCatalog(list);
  assert.equal(bare.hasPosters, false);
  assert.equal(bare.tmdbId("1972-the-godfather"), null);
});

test("watched on a given evening, or seen before Kuvert with no date", async () => {
  const { paceData } = await import("../../js/state/stats.js");
  const store = makeStore();
  const [a, b, c] = store.catalog.films;
  store.markSeen(a.id, true);
  assert.equal(store.p.dates[a.id], "2026-09-26", "tonight by default");
  store.markSeen(b.id, true, { date: "2026-09-20" });
  assert.equal(store.p.dates[b.id], "2026-09-20", "the night it was drawn");
  store.markSeen(c.id, true, { date: null });
  assert.ok(store.p.seen.has(c.id) && !(c.id in store.p.dates), "seen before: watched, no date");
  store.markSeen(store.catalog.films[3].id, true, { date: "not a date" });
  assert.equal(store.p.dates[store.catalog.films[3].id], "2026-09-26", "a bad date falls back to tonight");
  // The pace only counts dated watches.
  for (const f of store.catalog.films.slice(10, 40)) store.markSeen(f.id, true, { date: null });
  const pace = paceData(store.p, store.catalog, new Date("2026-09-26T20:00:00"));
  assert.equal(pace.count, 3);
});

test("a watched film's first stars put it in the ranking, by those stars", () => {
  const store = makeStore();
  const [a, b, c, d, e] = store.catalog.films;
  for (const f of [a, b, c, d, e]) store.markSeen(f.id, true);
  store.rate(a.id, 3);
  store.rate(b.id, 5);
  store.rate(c.id, 4);
  assert.deepEqual(store.p.rankings, [b.id, c.id, a.id]);
  // Your own order stays: re-rating a ranked film doesn't move it, and ties go after their equals.
  store.moveRank(a.id, -2);
  store.rate(a.id, 2);
  store.rate(d.id, 4);
  assert.deepEqual(store.p.rankings, [a.id, b.id, c.id, d.id]);
  // Not watched: no place yet. Rated before ranking-by-stars (or taken out): placeRated puts them in.
  store.rate(store.catalog.films[9].id, 5);
  assert.ok(!store.p.rankings.includes(store.catalog.films[9].id));
  store.removeFromRanking(c.id);
  store.p.reviews[e.id] = { note: "", rating: 4.5 };
  const undo = store.placeRated();
  assert.deepEqual(store.p.rankings, [a.id, b.id, e.id, d.id, c.id], "4.5 after the 5; the 4 after the other 4");
  assert.ok(undo);
});

test("stars given in the note dialog place the film in the ranking too", () => {
  const store = makeStore();
  const [a, b, c] = store.catalog.films;
  for (const f of [a, b, c]) store.markSeen(f.id, true);
  store.rate(a.id, 3);
  const undo = store.saveReview(b.id, { note: "The ending.", rating: 4.5 });
  assert.deepEqual(store.p.rankings, [b.id, a.id]);
  // A note alone doesn't; nor does a second save move a film you've placed yourself.
  store.saveReview(c.id, { note: "Hm.", rating: null });
  store.moveRank(b.id, 1);
  store.saveReview(b.id, { note: "The ending!", rating: 5 });
  assert.deepEqual(store.p.rankings, [a.id, b.id]);
  // Undo takes the stars and the place back together.
  store.restore(undo);
  assert.deepEqual(store.p.rankings, [a.id, b.id].filter((id) => id !== b.id));
});
