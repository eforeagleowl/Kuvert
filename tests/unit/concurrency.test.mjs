import { test } from "node:test";
import assert from "node:assert/strict";
import { Store } from "../../js/state/store.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { resolveList } from "../../js/data/lists.js";
import { bySync, emptyProgress } from "../../js/state/merge.js";
import { KEYS } from "../../js/compat/keys.js";
import { MemoryStorage } from "./helpers.mjs";
import { Sync } from "../../js/storage/sync.js";

const now = () => new Date("2026-10-13T19:00:00Z");
function tab(storage) {
  const list = resolveList(storage), store = new Store({ list, catalog: makeCatalog(list), storage, now });
  store.load();
  return store;
}

test("a stale tab preserves another tab's watched marks and ratings before its own write", () => {
  const storage = new MemoryStorage(), a = tab(storage), b = tab(storage);
  a.markSeen("1942-casablanca", true);
  b.markSeen("1927-wings", true);
  a.rate("1942-casablanca", 4.5);
  b.set({ query: "winter" });
  const final = tab(storage);
  assert.deepEqual([...final.p.seen].sort(), ["1927-wings", "1942-casablanca"]);
  assert.equal(final.p.reviews["1942-casablanca"].rating, 4.5);
  assert.equal(final.settings.query, "winter");
});

test("unmarks and shelf deletions are retained when a stale tab saves preferences", () => {
  const storage = new MemoryStorage(), a = tab(storage);
  a.markSeen("1942-casablanca", true);
  a.toggleShelf("1927-wings");
  const b = tab(storage);
  a.markSeen("1942-casablanca", false);
  a.toggleShelf("1927-wings");
  b.set({ country: "SE" });
  const final = tab(storage);
  assert.ok(!final.p.seen.has("1942-casablanca") && !final.p.shelf.has("1927-wings"));
  assert.equal(final.p.dates["1942-casablanca"], undefined);
  assert.ok(final.p.stamps["1942-casablanca"] && final.p.stamps["1927-wings"]);
});

test("Undo reverses its film without erasing unrelated work from another tab", () => {
  const storage = new MemoryStorage(), a = tab(storage), b = tab(storage);
  const change = a.markSeen("1942-casablanca", true);
  b.markSeen("1927-wings", true);
  a.undo(change.undo);
  const final = tab(storage);
  assert.deepEqual([...final.p.seen], ["1927-wings"]);
});

test("Undo preserves a later change to the same film on another tab and reports the overlap", () => {
  const storage = new MemoryStorage(), a = tab(storage), b = tab(storage);
  const change = a.markSeen("1942-casablanca", true);
  b.rate("1942-casablanca", 5);
  const undo = a.undo(change.undo);
  assert.deepEqual(undo.conflicts, ["1942-casablanca"]);
  assert.equal(a.lastConflict.source, "undo");
  const final = tab(storage);
  assert.ok(final.p.seen.has("1942-casablanca"));
  assert.equal(final.p.reviews["1942-casablanca"].rating, 5);
});

test("a conflicted Undo never restores a watched film onto tonight's ticket", () => {
  const storage = new MemoryStorage(), a = tab(storage), b = tab(storage);
  a.pick("1942-casablanca");
  const change = a.markSeen("1942-casablanca", true);
  b.rate("1942-casablanca", 5);
  a.undo(change.undo);
  assert.ok(a.p.seen.has("1942-casablanca"));
  assert.equal(a.p.current, null);
  assert.equal(a.p.drawnOn, null);
});

test("Undo protects an incoming change even when another device used the identical film stamp", () => {
  const storage = new MemoryStorage(), a = tab(storage);
  const change = a.markSeen("1942-casablanca", true);
  const incoming = { ...a.data(), reviews: { "1942-casablanca": { note: "A newer remote review", rating: 5 } } };
  // A genuinely simultaneous device can observe the same millisecond. Its record wins the stable
  // tie-break, but timestamp comparison alone would mistake it for our own original edit.
  storage.setItem(KEYS.builtin, JSON.stringify(incoming));
  const result = a.undo(change.undo);
  assert.deepEqual(result.conflicts, ["1942-casablanca"]);
  assert.ok(a.p.seen.has("1942-casablanca"));
  assert.equal(a.p.reviews["1942-casablanca"].rating, 5);
});

test("Undo stamps deleted reviews and shelves so stale copies cannot resurrect them", () => {
  const storage = new MemoryStorage(), a = tab(storage);
  const shelf = a.toggleShelf("1927-wings");
  const b = tab(storage);
  a.undo(shelf);
  b.markSeen("1942-casablanca", true);
  assert.ok(!tab(storage).p.shelf.has("1927-wings"));
  const review = a.saveReview("1942-casablanca", { note: "Temporary note", rating: 3 });
  const c = tab(storage);
  a.undo(review);
  c.set({ country: "SE" });
  assert.equal(tab(storage).p.reviews["1942-casablanca"], undefined);
});

test("equal timestamp conflicts converge regardless of merge direction", () => {
  const a = emptyProgress(), b = emptyProgress();
  a.seen.add("film"); b.seen.add("film");
  a.reviews.film = { note: "A", rating: 2 };
  b.reviews.film = { note: "B", rating: 4 };
  a.current = "next-a"; b.current = "next-b";
  a.rankings = ["film", "a"]; b.rankings = ["b", "film"];
  a.stamps = b.stamps = { film: now().toISOString(), $current: now().toISOString(), $ranking: now().toISOString() };
  const forward = bySync(a, b), reverse = bySync(b, a);
  assert.deepEqual(forward.reviews, reverse.reviews);
  assert.equal(forward.current, reverse.current);
  assert.deepEqual(forward.rankings, reverse.rankings);
});

test("fixed clocks still produce strictly increasing stamps across tabs", () => {
  const storage = new MemoryStorage(), a = tab(storage), b = tab(storage);
  a.rate("1942-casablanca", 2);
  const first = a.p.stamps["1942-casablanca"];
  b.rate("1942-casablanca", 4);
  assert.ok(Date.parse(b.p.stamps["1942-casablanca"]) > Date.parse(first));
  assert.equal(tab(storage).p.reviews["1942-casablanca"].rating, 4);
});

test("a newly unreadable save is protected from a stale tab's edit", () => {
  const storage = new MemoryStorage(), a = tab(storage);
  a.markSeen("1927-wings", true);
  storage.setItem(KEYS.builtin, "unreadable");
  a.rate("1942-casablanca", 3);
  assert.equal(storage.getItem(KEYS.builtin), "unreadable");
  assert.equal(storage.getItem(KEYS.unreadable(KEYS.builtin)), "unreadable");
  assert.equal(a.writeLocked, true);
  assert.equal(a.dirty, true);
  a.startFresh();
  assert.equal(a.writeLocked, false);
  assert.ok(storage.getItem(KEYS.builtin).startsWith("{"));
});

test("a storage event refreshes views and detached stores remove their listeners", () => {
  const target = new EventTarget(), add = globalThis.addEventListener, remove = globalThis.removeEventListener;
  globalThis.addEventListener = target.addEventListener.bind(target);
  globalThis.removeEventListener = target.removeEventListener.bind(target);
  try {
    const storage = new MemoryStorage(), a = tab(storage), b = tab(storage);
    let updates = 0;
    b.addEventListener("change", (event) => { if (event.detail.kind === "cross-tab") updates++; });
    a.markSeen("1942-casablanca", true);
    const event = new Event("storage");
    Object.assign(event, { key: KEYS.builtin, storageArea: storage });
    target.dispatchEvent(event);
    assert.ok(b.p.seen.has("1942-casablanca"));
    assert.equal(updates, 1);
    b.dispose();
    a.markSeen("1927-wings", true);
    target.dispatchEvent(event);
    assert.ok(!b.p.seen.has("1927-wings"));
    a.dispose();
  } finally {
    if (add) globalThis.addEventListener = add; else delete globalThis.addEventListener;
    if (remove) globalThis.removeEventListener = remove; else delete globalThis.removeEventListener;
  }
});

function gistServer() {
  const state = { remote: null, reads: 0, patches: 0, beforeRead: null, afterPatch: null };
  state.fetch = async (_url, { method = "GET", body } = {}) => {
    if (method === "PATCH") {
      state.patches++;
      const content = Object.values(JSON.parse(body).files)[0].content;
      state.remote = JSON.parse(content);
      await state.afterPatch?.(state.patches);
    } else {
      state.reads++;
      await state.beforeRead?.(state.reads);
    }
    const response = structuredClone(state.remote ? { files: { "kuvert-builtin.json": { content: JSON.stringify(state.remote) } } } : { files: {} });
    return { ok: true, status: 200, json: async () => response };
  };
  return state;
}
function syncedTab(server) {
  const storage = new MemoryStorage(), store = tab(storage), sync = new Sync({ store, storage, fetch: server.fetch });
  sync.cfg = { token: "token", gistId: "gist", last: {} };
  sync.write();
  return { store, sync, storage };
}

test("sync rereads and merges a device update arriving immediately before upload", async () => {
  const server = gistServer(), local = syncedTab(server), other = tab(new MemoryStorage());
  local.store.markSeen("1927-wings", true);
  other.markSeen("1942-casablanca", true);
  server.beforeRead = (count) => { if (count === 2) server.remote = other.data(); };
  const result = await local.sync.syncNow();
  assert.equal(result.applied, "merge");
  assert.deepEqual(server.remote.seen, ["1927-wings", "1942-casablanca"]);
  assert.equal(server.patches, 1);
  assert.equal(local.sync.last.signature, local.store.signature());
});

test("sync detects a racing overwrite after upload and retries with both devices' records", async () => {
  const server = gistServer(), local = syncedTab(server), other = tab(new MemoryStorage());
  local.store.markSeen("1927-wings", true);
  other.markSeen("1942-casablanca", true);
  server.afterPatch = (count) => { if (count === 1) server.remote = other.data(); };
  await local.sync.syncNow();
  assert.deepEqual(server.remote.seen, ["1927-wings", "1942-casablanca"]);
  assert.equal(server.patches, 2);
  assert.equal(local.sync.error, "");
});

test("sync Undo covers every retry's remote records and keeps changes made locally during sync", async () => {
  const server = gistServer(), local = syncedTab(server), other = tab(new MemoryStorage());
  local.store.markSeen("1927-wings", true);
  other.markSeen("1942-casablanca", true);
  server.remote = other.data();
  server.afterPatch = (count) => {
    if (count === 1) {
      other.markSeen("1976-rocky", true);
      server.remote = other.data();
      local.store.markSeen("1972-the-godfather", true);
    }
  };
  const result = await local.sync.syncNow();
  assert.deepEqual([...local.store.p.seen].sort(), ["1927-wings", "1942-casablanca", "1972-the-godfather", "1976-rocky"]);
  local.store.undo(result.undo);
  assert.deepEqual([...local.store.p.seen].sort(), ["1927-wings", "1972-the-godfather"]);
});

test("sync includes local edits made during the request instead of recording an outdated success", async () => {
  const server = gistServer(), local = syncedTab(server);
  local.store.markSeen("1927-wings", true);
  server.afterPatch = (count) => { if (count === 1) local.store.markSeen("1942-casablanca", true); };
  await local.sync.syncNow();
  assert.equal(server.patches, 2);
  assert.deepEqual(server.remote.seen, ["1927-wings", "1942-casablanca"]);
  assert.equal(local.sync.last.signature, local.store.signature());
});

test("overlapping remote choices produce a review warning and the newest film choice wins", async () => {
  const server = gistServer(), local = syncedTab(server), other = tab(new MemoryStorage());
  local.store.markSeen("1942-casablanca", true);
  local.store.rate("1942-casablanca", 2);
  other.markSeen("1942-casablanca", true);
  other.rate("1942-casablanca", 4);
  other.rate("1942-casablanca", 5);
  server.remote = other.data();
  const result = await local.sync.syncNow();
  assert.ok(result.conflicts.includes("1942-casablanca"));
  assert.match(result.warning, /changed on both devices/);
  assert.equal(local.store.p.reviews["1942-casablanca"].rating, 5);
});

test("sync stops after three unverified writes and keeps unsynced browser progress", async () => {
  const server = gistServer(), local = syncedTab(server);
  local.store.markSeen("1927-wings", true);
  server.beforeRead = (count) => { if (count >= 3 && count % 2 === 1) local.store.rate("1942-casablanca", count % 4 === 1 ? 3 : 4); };
  const result = await local.sync.syncNow();
  assert.match(result.error, /Progress kept changing/);
  assert.equal(server.patches, 3);
  assert.equal(local.sync.last, null);
  assert.ok(local.store.p.seen.has("1927-wings"));
  assert.equal(local.store.dirty, false);
});

test("disconnecting during an initial read prevents its result from being applied or uploaded", async () => {
  const server = gistServer(), local = syncedTab(server), other = tab(new MemoryStorage());
  other.markSeen("1942-casablanca", true);
  server.remote = other.data();
  server.beforeRead = () => local.sync.disconnect();
  const result = await local.sync.syncNow();
  assert.match(result.error, /Sync settings changed/);
  assert.equal(server.patches, 0);
  assert.equal(local.store.p.seen.size, 0);
});
