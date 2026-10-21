// An envelope installed before its films changed is brought up to date, never at the cost of progress.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./helpers.mjs";
import { CURATED_COLLECTIONS } from "../../js/data/curated.js";
import { buildListDefinition, readCustomLists, writeCustomLists, resolveList } from "../../js/data/lists.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { Store } from "../../js/state/store.js";
import { KEYS } from "../../js/compat/keys.js";
import { upgradeCurated } from "../../js/views/journeys.js";

const winter = CURATED_COLLECTIONS.find((c) => c.id === "curated-swedish-winter");
const carriage = "1921-the-phantom-carriage",
  songs = "2000-songs-from-the-second-floor",
  seal = "1957-the-seventh-seal";
// Version 1 as it was installed: The Phantom Carriage where Songs from the Second Floor is now.
const v1 = () => ({ ...buildListDefinition({ ...winter, films: [{ t: "The Phantom Carriage", y: 1921, id: carriage }, ...winter.films.filter((f) => f.id !== songs)] }), version: 1 });
const withV1 = (save) => {
  const storage = new MemoryStorage();
  writeCustomLists(storage, { [winter.id]: v1() });
  storage.setItem(KEYS.activeList, winter.id);
  if (save) storage.setItem(KEYS.list(winter.id), JSON.stringify(save));
  return storage;
};
const open = (storage) => {
  const list = resolveList(storage);
  const store = new Store({ list, catalog: makeCatalog(list), storage });
  store.load();
  return store;
};

test("A Swedish Winter's version 2 swaps The Phantom Carriage for Songs from the Second Floor", () => {
  assert.equal(winter.version, 2);
  assert.ok(winter.films.some((f) => f.id === songs));
  assert.ok(!winter.films.some((f) => f.id === carriage));
  assert.ok(CURATED_COLLECTIONS.find((c) => c.id === "curated-silent").films.some((f) => f.id === carriage), "still in the silent envelope");
});

test("an untouched or unrelated copy is brought up to date, and its progress comes along", () => {
  const storage = withV1();
  const store = open(storage);
  store.markSeen(seal, true);
  upgradeCurated(storage);
  const def = readCustomLists(storage)[winter.id];
  assert.equal(def.version, 2);
  assert.ok(def.films.some((f) => f.id === songs));
  const again = open(storage);
  assert.equal(again.writeLocked, false);
  assert.ok(again.p.seen.has(seal), "The Seventh Seal is still watched");
  assert.equal(again.catalog.films.length, 6);
});

test("a copy whose progress mentions the removed film stays as it was", () => {
  const storage = withV1();
  open(storage).markSeen(carriage, true);
  upgradeCurated(storage);
  const def = readCustomLists(storage)[winter.id];
  assert.equal(def.version, 1);
  assert.ok(def.films.some((f) => f.id === carriage));
  assert.ok(open(storage).p.seen.has(carriage), "nothing recorded is lost");
});
