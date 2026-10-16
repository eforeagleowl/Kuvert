// Galan: the full Best Picture ballot as an extra mode beside the regular list (js/fun/gala.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./helpers.mjs";
import { FILMS, PALETTES } from "../../js/data/catalogue.js";
import { CEREMONIES } from "../../js/data/ceremonies.js";
import { resolveList } from "../../js/data/lists.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { Store } from "../../js/state/store.js";
import { KEYS } from "../../js/compat/keys.js";
import { GALA_LIST_ID, galaFilms, installGalaList, carryWatched } from "../../js/fun/gala.js";

const open = (storage) => {
  const list = resolveList(storage);
  const store = new Store({ list, catalog: makeCatalog(list), storage, now: () => new Date("2026-10-16T20:00:00Z") });
  store.load();
  return { list, store, storage, toast: { shown: [], show(m) { this.shown.push(m); } } };
};

test("Galan holds every Best Picture nominee once, no honorable mentions; the regular list stays as it is", () => {
  const films = galaFilms();
  assert.equal(films.length, CEREMONIES.reduce((n, c) => n + c.films.length, 0));
  assert.equal(new Set(films.map((f) => f.id)).size, films.length, "each film once");
  assert.equal(films.filter((f) => f.s === "W").length, CEREMONIES.length, "one winner per ceremony");
  assert.ok(films.every((f) => f.s === "W" || f.s === "N"));
  // Every winner and nominee on the regular list is in it, under the same id and title.
  const byId = new Map(films.map((f) => [f.id, f]));
  for (const f of FILMS.filter((f) => f.s !== "H")) {
    assert.equal(byId.get(f.id)?.t, f.t, f.id);
    assert.equal(byId.get(f.id).c, f.c, f.id + " competed at the same ceremony");
  }
  assert.ok(FILMS.filter((f) => f.s === "H").every((f) => !byId.has(f.id)), "no honorable mentions");
  assert.deepEqual(films.filter((f) => f.tri === "gf").map((f) => f.ord), [1, 2, 3], "series still play in order");
  assert.equal(FILMS.length, 275);
});

test("entering installs the list once, in its own palette", () => {
  const storage = new MemoryStorage();
  const def = installGalaList(storage);
  assert.equal(def.id, GALA_LIST_ID);
  assert.equal(def.palette, "gala");
  assert.ok(PALETTES.gala);
  assert.equal(def.films.length, galaFilms().length);
  const stored = storage.getItem(KEYS.lists);
  assert.deepEqual(installGalaList(storage), def);
  assert.equal(storage.getItem(KEYS.lists), stored, "already installed: nothing rewritten");
});

test("films watched in either list count in the other; a film un-marked or set aside stays as it is", () => {
  const storage = new MemoryStorage();
  // The regular list: three watched, one with a date and stars.
  let app = open(storage);
  const casablanca = "1942-casablanca", rocky = "1976-rocky", heat = "1995-heat", gone = "1939-gone-with-the-wind";
  for (const id of [casablanca, rocky, heat]) app.store.markSeen(id, true);
  app.store.setDate(rocky, "2026-02-03");
  app.store.rate(rocky, 4.5);
  // Into the gala: the two nominees come along (Heat is an honorable mention, not on the ballots).
  installGalaList(storage);
  storage.setItem(KEYS.activeList, GALA_LIST_ID);
  app = open(storage);
  assert.equal(app.list.id, GALA_LIST_ID);
  assert.equal(carryWatched(app), 2);
  assert.deepEqual([...app.store.p.seen].sort(), [casablanca, rocky].sort());
  assert.equal(app.store.p.dates[rocky], "2026-02-03");
  assert.equal(app.store.p.reviews[rocky].rating, 4.5);
  assert.match(app.toast.shown[0], /2 films came along from Kuvert/);
  // Un-marked here, watched elsewhere: it stays un-marked. Gone with the Wind, watched here, goes back.
  app.store.markSeen(casablanca, false);
  app.store.markSeen(gone, true);
  assert.equal(carryWatched(app), 0);
  assert.equal(app.store.p.seen.has(casablanca), false);
  storage.setItem(KEYS.activeList, "builtin");
  app = open(storage);
  assert.equal(carryWatched(app), 1);
  assert.ok(app.store.p.seen.has(gone));
  assert.ok(app.store.p.seen.has(casablanca), "un-marking in the gala doesn't un-mark the regular list");
  assert.equal(carryWatched(app), 0, "once is enough");
});

test("its Oscar lines are the Academy's, with every film of the field", () => {
  const storage = new MemoryStorage();
  installGalaList(storage);
  storage.setItem(KEYS.activeList, GALA_LIST_ID);
  const catalog = makeCatalog(resolveList(storage));
  const rocky = catalog.byId.get("1976-rocky");
  assert.equal(catalog.ceremonyFilms(49).length, 5);
  assert.match(catalog.oscarLine(rocky), /^Beat .+ and 1 more at the 49th Academy Awards\.$/);
  assert.match(catalog.oscarLine(catalog.byId.get("1976-taxi-driver")), /^Lost to Rocky at the 49th Academy Awards\.$/);
  // The regular list's own lines are untouched.
  const regular = makeCatalog(resolveList(new MemoryStorage()));
  assert.equal(regular.list.id, "builtin");
  assert.equal(regular.films.length, 275);
});
