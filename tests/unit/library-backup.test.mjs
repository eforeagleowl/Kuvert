import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../../js/state/store.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { buildListDefinition, resolveList } from "../../js/data/lists.js";
import { KEYS } from "../../js/compat/keys.js";
import { exportLibrary, readLibraryBackup, previewLibraryRestore, restoreLibrary, validateLibraryBackup, LIBRARY_BACKUP_LIMIT } from "../../js/storage/library-backup.js";
import { MemoryStorage } from "./helpers.mjs";

const now = () => new Date("2026-10-13T19:00:00Z");
function storeFor(storage) {
  const list = resolveList(storage), store = new Store({ list, catalog: makeCatalog(list), storage, now });
  assert.equal(store.load(), null);
  return store;
}
function library() {
  const storage = new MemoryStorage();
  const built = storeFor(storage);
  built.markSeen("1942-casablanca", true);
  built.saveReview("1942-casablanca", { note: "Play it again", rating: 4.5 });
  built.set({ country: "SE" });
  const definition = buildListDefinition({ id: "winter", name: "Winter nights", films: [{ title: "Persona", year: 1966 }, { title: "The Seventh Seal", year: 1957 }] });
  storage.setItem(KEYS.lists, JSON.stringify({ winter: definition }));
  storage.setItem(KEYS.activeList, "winter");
  const custom = storeFor(storage);
  custom.markSeen("1966-persona", true);
  custom.toggleShelf("1957-the-seventh-seal");
  storage.setItem(KEYS.lang, "sv");
  storage.setItem(KEYS.sounds, "off");
  storage.setItem(KEYS.group("winter"), JSON.stringify({ on: true, people: [{ name: "Alva", seen: ["1966-persona"], added: now().toISOString() }] }));
  storage.setItem("kuvert:journeys:v1", JSON.stringify({ ballots: { "oscars-1977": { winnerId: "1976-rocky", date: "2026-10-13" } } }));
  storage.setItem(KEYS.tmdb, "private-movie-token");
  storage.setItem(KEYS.sync, JSON.stringify({ token: "private-github-token", gistId: "gist", last: {} }));
  storage.setItem("kuvert:club:v1", JSON.stringify({ token: "private-club-token" }));
  return { storage, built, custom };
}

test("full-library export carries every list, personal data and safe preferences, excluding credentials and caches", async () => {
  const { storage, custom } = library();
  custom.caches.availability = { SE: { "1966-persona": { at: Date.now(), ids: [8] } } };
  custom.persist();
  const snapshot = exportLibrary(storage, { store: custom, now });
  assert.equal(snapshot.lists.length, 2);
  assert.equal(snapshot.activeList, "winter");
  assert.deepEqual(snapshot.lists.find((x) => x.id === "builtin").progress.seen, ["1942-casablanca"]);
  assert.equal(snapshot.lists.find((x) => x.id === "builtin").progress.reviews["1942-casablanca"].note, "Play it again");
  assert.equal(snapshot.lists.find((x) => x.id === "winter").definition.films.length, 2);
  assert.equal(snapshot.preferences[KEYS.lang], "sv");
  assert.equal(snapshot.groups.winter.people[0].name, "Alva");
  const text = JSON.stringify(snapshot);
  assert.ok(!/private-|availability|providerDirectories|lastBackup/.test(text));
  assert.deepEqual(await readLibraryBackup(text), snapshot);
  assert.deepEqual(await readLibraryBackup({ size: text.length, text: async () => text }), snapshot);
});

test("restore validates the final list and every preference before making any writes", () => {
  const { storage } = library(), target = new MemoryStorage({ sentinel: "keep" });
  const snapshot = exportLibrary(storage, { now });
  snapshot.lists.at(-1).progress.reviews["1966-persona"] = { note: "bad", rating: 6 };
  const before = new Map(target.map);
  assert.throws(() => restoreLibrary(target, snapshot), /Invalid movie note/);
  assert.deepEqual(target.map, before);
  const withToken = exportLibrary(storage, { now });
  withToken.preferences[KEYS.tmdb] = "injected-token";
  assert.throws(() => restoreLibrary(target, withToken), /Unknown or invalid library preference/);
  assert.deepEqual(target.map, before);
});

test("merge preview and restore preserve local choices, add missing lists and keep credentials", () => {
  const source = library(), target = new MemoryStorage({ [KEYS.tmdb]: "keep-my-token", [KEYS.lang]: "en" });
  const local = storeFor(target);
  local.markSeen("1927-wings", true);
  local.markSeen("1942-casablanca", true);
  local.rate("1942-casablanca", 2);
  const snapshot = exportLibrary(source.storage, { now });
  const preview = previewLibraryRestore(target, snapshot, "merge");
  assert.deepEqual({ lists: preview.lists, newLists: preview.newLists, watchedBefore: preview.watchedBefore, watchedAfter: preview.watchedAfter }, { lists: 2, newLists: 1, watchedBefore: 2, watchedAfter: 3 });
  const before = new Map(target.map);
  const restored = restoreLibrary(target, snapshot);
  assert.deepEqual(restored.summary, preview);
  const built = storeFor(target);
  assert.deepEqual([...built.p.seen].sort(), ["1927-wings", "1942-casablanca"]);
  assert.equal(built.p.reviews["1942-casablanca"].rating, 2);
  assert.equal(target.getItem(KEYS.lang), "en");
  assert.equal(target.getItem(KEYS.tmdb), "keep-my-token");
  restored.rollback();
  assert.deepEqual(target.map, before);
});

test("replace removes omitted custom lists while retaining secrets and supports rollback", () => {
  const target = library(), source = new MemoryStorage();
  const replacement = storeFor(source);
  replacement.markSeen("1976-rocky", true);
  const snapshot = exportLibrary(source, { now });
  const before = new Map(target.storage.map);
  const result = restoreLibrary(target.storage, snapshot, { mode: "replace" });
  assert.equal(result.summary.removedLists, 1);
  assert.equal(target.storage.getItem(KEYS.list("winter")), null);
  assert.equal(target.storage.getItem(KEYS.group("winter")), null);
  assert.equal(target.storage.getItem(KEYS.lang), null);
  assert.equal(target.storage.getItem(KEYS.tmdb), "private-movie-token");
  assert.equal(target.storage.getItem("kuvert:club:v1"), before.get("kuvert:club:v1"));
  assert.deepEqual([...storeFor(target.storage).p.seen], ["1976-rocky"]);
  result.rollback();
  assert.deepEqual(target.storage.map, before);
});

test("a storage failure rolls every prior write back", () => {
  class FailOnce extends MemoryStorage {
    writes = 0;
    setItem(key, value) { if (++this.writes === 2) throw Error("quota"); super.setItem(key, value); }
  }
  const { storage } = library();
  const target = new FailOnce({ sentinel: "still here", [KEYS.tmdb]: "secret" });
  const before = new Map(target.map);
  assert.throws(() => restoreLibrary(target, exportLibrary(storage, { now })), /previous library has been restored/);
  assert.deepEqual(target.map, before);
});

test("rollback refuses to overwrite newer work", () => {
  const { storage } = library(), target = new MemoryStorage();
  const result = restoreLibrary(target, exportLibrary(storage, { now }), { mode: "replace" });
  const custom = storeFor(target);
  custom.markSeen("1957-the-seventh-seal", true);
  assert.throws(() => result.rollback(), /library changed after the restore/);
  assert.ok(storeFor(target).p.seen.has("1957-the-seventh-seal"));
});

test("an unreadable inactive save or list registry prevents an incomplete export", () => {
  const { storage, custom } = library();
  storage.setItem(KEYS.builtin, "not json");
  assert.throws(() => exportLibrary(storage, { store: custom, now }), /could not be read/);
  storage.setItem(KEYS.lists, "not json");
  assert.throws(() => exportLibrary(storage, { now }), /list definitions could not be read/);
});

test("library file limits, duplicate IDs, invalid detail fields and unsafe ballot schemas are rejected", async () => {
  const { storage } = library();
  await assert.rejects(readLibraryBackup({ size: LIBRARY_BACKUP_LIMIT + 1, text: async () => "{}" }), /too large/);
  const duplicate = exportLibrary(storage, { now });
  duplicate.lists.push(duplicate.lists.at(-1));
  assert.throws(() => validateLibraryBackup(duplicate), /unique custom lists/);
  const invalidPoster = exportLibrary(storage, { now });
  invalidPoster.lists[0].progress.posterPaths = { "1942-casablanca": "javascript:bad" };
  assert.throws(() => validateLibraryBackup(invalidPoster), /poster path/);
  const badBallot = exportLibrary(storage, { now });
  badBallot.preferences["kuvert:journeys:v1"] = JSON.stringify({ ballots: {}, token: "secret" });
  assert.throws(() => validateLibraryBackup(badBallot), /library preference/);
});

test("merge keeps all films when the same custom list grew on either device", () => {
  const { storage } = library();
  const snapshot = exportLibrary(storage, { now });
  const def = snapshot.lists.find((x) => x.id === "winter").definition;
  def.films.push({ id: "2008-let-the-right-one-in", t: "Let the Right One In", y: 2008, s: "" });
  def.catalogue = "custom:winter:3";
  const custom = snapshot.lists.find((x) => x.id === "winter");
  custom.progress.catalogue = def.catalogue;
  custom.progress.list = def;
  custom.progress.seen.push("2008-let-the-right-one-in");
  const result = restoreLibrary(storage, snapshot);
  assert.equal(result.summary.warnings.length, 1);
  const restored = storeFor(storage);
  assert.equal(restored.catalog.films.length, 3);
  assert.ok(restored.p.seen.has("1966-persona") && restored.p.seen.has("2008-let-the-right-one-in"));
});

test("Replace can recover unreadable saves, and rollback preserves the unreadable original", () => {
  const source = library(), target = new MemoryStorage({ [KEYS.builtin]: "unreadable save", [KEYS.lists]: "unreadable registry" });
  const before = new Map(target.map);
  const result = restoreLibrary(target, exportLibrary(source.storage, { now }), { mode: "replace" });
  assert.equal(result.summary.warnings.length, 1);
  assert.ok(storeFor(target).p.seen.has("1966-persona"));
  result.rollback();
  assert.deepEqual(target.map, before);
});

test("restored deletions receive new stamps so another tab cannot resurrect them", () => {
  const target = new MemoryStorage(), oldTab = storeFor(target);
  oldTab.markSeen("1942-casablanca", true);
  const oldStamp = oldTab.p.stamps["1942-casablanca"];
  const source = new MemoryStorage(), clean = storeFor(source);
  clean.markSeen("1927-wings", true);
  restoreLibrary(target, exportLibrary(source, { now }), { mode: "replace" });
  oldTab.set({ query: "after restore" });
  const current = storeFor(target);
  assert.ok(!current.p.seen.has("1942-casablanca"));
  assert.ok(current.p.seen.has("1927-wings"));
  assert.ok(Date.parse(current.p.stamps["1942-casablanca"]) > Date.parse(oldStamp));
});

test("Merge combines ballot collections and group members while keeping local overlapping choices", () => {
  const source = library(), target = library();
  source.storage.setItem("kuvert:journeys:v1", JSON.stringify({ ballots: { "oscars-1977": { winnerId: "1976-taxi-driver", date: "2026-10-12" }, "oscars-1944": { winnerId: "1942-casablanca", date: "2026-10-12" } } }));
  source.storage.setItem(KEYS.group("winter"), JSON.stringify({ on: true, people: [{ name: "Erik", seen: ["1957-the-seventh-seal"], added: now().toISOString() }] }));
  restoreLibrary(target.storage, exportLibrary(source.storage, { now }));
  const ballots = JSON.parse(target.storage.getItem("kuvert:journeys:v1")).ballots;
  assert.equal(ballots["oscars-1977"].winnerId, "1976-rocky");
  assert.equal(ballots["oscars-1944"].winnerId, "1942-casablanca");
  assert.deepEqual(JSON.parse(target.storage.getItem(KEYS.group("winter"))).people.map((p) => p.name).sort(), ["Alva", "Erik"]);
});
