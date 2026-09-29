// The state model: loading the original app's browser save, the draw rules, watching, undo, merging.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveList } from "../../js/data/lists.js";
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

test("the list's own posters: used while fresh, only for the built-in list, and your own match first", async () => {
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
  const custom = makeCatalog({ id: "mine", custom: true, name: "Mine", films: [{ t: "Ben-Hur", y: 1959, id: "1959-ben-hur" }] }, { posters });
  assert.equal(custom.poster("1959-ben-hur"), null, "imported lists don't borrow the built-in list's posters");
  assert.equal(custom.hasPosters, false);
});
