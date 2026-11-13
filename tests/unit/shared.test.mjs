// One watched record across lists (js/state/shared.js): a film watched in one list is watched in every
// list that has it, each list still keeps its own save, and the Envelopes cards count it before it arrives.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./helpers.mjs";
import { buildListDefinition, readCustomLists, resolveList, writeCustomLists } from "../../js/data/lists.js";
import { CURATED_COLLECTIONS } from "../../js/data/curated.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { Store } from "../../js/state/store.js";
import { KEYS } from "../../js/compat/keys.js";
import { GALA_LIST_ID, installGalaList } from "../../js/fun/gala.js";
import { carryWatched, listRecords, watchedAcross } from "../../js/state/shared.js";

const hitchcock = CURATED_COLLECTIONS.find((c) => c.id === "curated-hitchcock");
const [REBECCA, REAR_WINDOW, VERTIGO, CASABLANCA] = ["1940-rebecca", "1954-rear-window", "1958-vertigo", "1942-casablanca"];

function install(storage, pack) {
  const lists = readCustomLists(storage);
  lists[pack.id] = { ...buildListDefinition(pack), version: pack.version };
  writeCustomLists(storage, lists);
}
// Opens a list the way the app does: resolve it, load its save, bring over what was watched elsewhere.
function open(storage, listId) {
  storage.setItem(KEYS.activeList, listId);
  const list = resolveList(storage);
  const store = new Store({ list, catalog: makeCatalog(list), storage, now: () => new Date("2026-11-11T20:00:00Z") });
  store.load();
  const app = { list, store, storage, toast: { shown: [], show(m) { this.shown.push(m); } } };
  app.came = carryWatched(app);
  return app;
}

test("a film watched in the main list is watched in an envelope and in Galan, with its date and stars", () => {
  const storage = new MemoryStorage();
  install(storage, hitchcock);
  installGalaList(storage);
  let app = open(storage, "builtin");
  assert.equal(app.came, 0);
  app.store.markSeen(REBECCA, true, { date: "2026-03-01" });
  app.store.rate(REBECCA, 4.5);
  app.store.markSeen(REAR_WINDOW, true, { date: null });
  app.store.markSeen(CASABLANCA, true);

  // The envelope's card counts them before the envelope is opened…
  const records = listRecords(storage, { id: app.list.id, p: app.store.p });
  const across = watchedAcross(records, hitchcock.id);
  assert.equal(hitchcock.films.filter((f) => across.has(f.id)).length, 2);
  // …and opening it brings them in: its own save now has them.
  app = open(storage, hitchcock.id);
  assert.equal(app.came, 2);
  assert.equal(app.toast.shown[0], "2 films came along from Kuvert.");
  assert.equal(app.store.p.dates[REBECCA], "2026-03-01");
  assert.equal(app.store.p.reviews[REBECCA].rating, 4.5);
  assert.ok(app.store.p.seen.has(REAR_WINDOW) && !(REAR_WINDOW in app.store.p.dates), "seen before stays undated");
  assert.equal(app.store.p.seen.has(CASABLANCA), false, "a film the envelope doesn't have stays out of it");

  // Vertigo, watched in the envelope, is in neither the main list nor a ballot: nothing to carry there.
  app.store.markSeen(VERTIGO, true);
  assert.equal(open(storage, "builtin").came, 0);
  // Galan gets Rebecca and Casablanca from the main list (Rebecca is in the envelope too: it comes once).
  app = open(storage, GALA_LIST_ID);
  assert.equal(app.came, 2);
  assert.deepEqual([...app.store.p.seen].sort(), [REBECCA, CASABLANCA].sort());
});

test("films from several lists arrive together, and a film un-marked here stays un-marked", () => {
  const storage = new MemoryStorage();
  install(storage, hitchcock);
  installGalaList(storage);
  open(storage, hitchcock.id).store.markSeen(REBECCA, true);
  open(storage, GALA_LIST_ID).store.markSeen(CASABLANCA, true); // Rebecca came along here: 1 from the envelope
  let app = open(storage, "builtin");
  assert.equal(app.came, 2);
  assert.equal(app.toast.shown[0], "2 films came along from your other lists.");
  assert.ok(app.store.p.seen.has(REBECCA) && app.store.p.seen.has(CASABLANCA));

  // Un-marked in the main list: the other lists keep it, the main list doesn't take it back.
  app.store.markSeen(REBECCA, false);
  app = open(storage, "builtin");
  assert.equal(app.came, 0);
  assert.equal(app.store.p.seen.has(REBECCA), false);
  assert.ok(open(storage, hitchcock.id).store.p.seen.has(REBECCA));
  // The cards agree: the main list's own decision counts for the main list only.
  const records = listRecords(storage);
  assert.equal(watchedAcross(records, "builtin").has(REBECCA), false);
  assert.equal(watchedAcross(records, GALA_LIST_ID).has(REBECCA), true);
});

test("every list still has a save of its own, and an unreadable one is left to its own page", () => {
  const storage = new MemoryStorage();
  install(storage, hitchcock);
  open(storage, "builtin").store.markSeen(REBECCA, true);
  const app = open(storage, hitchcock.id);
  assert.ok(JSON.parse(storage.getItem(KEYS.list(hitchcock.id))).seen.includes(REBECCA), "the envelope's backup, code and sync include it");
  assert.equal(JSON.parse(storage.getItem(KEYS.builtin)).seen.length, 1);
  storage.setItem(KEYS.builtin, "{not json");
  assert.equal(carryWatched(app), 0);
  assert.equal(listRecords(storage).has("builtin"), false);
});
