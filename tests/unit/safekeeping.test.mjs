// Keeping progress safe: a save that can't be read is never written over, and Tonight's reminder to
// keep a copy appears when it should and not otherwise.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveList } from "../../js/data/lists.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { Store } from "../../js/state/store.js";
import { Safekeeping, REMIND } from "../../js/storage/safekeeping.js";
import { Sync } from "../../js/storage/sync.js";
import { validateProgress } from "../../js/compat/validate.js";
import { MemoryStorage } from "./helpers.mjs";

const NOW = new Date("2026-09-27T20:00:00Z");
const DAY = 864e5;

function setup(entries = {}) {
  const storage = new MemoryStorage(entries);
  const list = resolveList(storage);
  const store = new Store({ list, catalog: makeCatalog(list), storage, now: () => NOW });
  const error = store.load();
  const files = { canPick: false, handle: null, warn: false };
  const sync = { on: false, last: null, error: "" };
  const keep = new Safekeeping({ store, storage, files, sync });
  return { storage, store, keep, files, sync, error };
}
const watch = (store, n, from = 0) => store.catalog.films.slice(from, from + n).forEach((f) => store.markSeen(f.id, true));

test("a save that can't be read is kept aside and never written over", () => {
  const broken = '{"app":"kuvert","v":7,"seen":["1927-wings"'; // cut off mid-write
  const { storage, store, error } = setup({ "kuvert:v4": broken });
  assert.match(error, /could not be read/);
  assert.equal(store.writeLocked, true);
  assert.equal(storage.getItem("kuvert:unreadable:kuvert:v4"), broken, "a spare copy under its own key");

  // Drawing and watching work in memory, but nothing reaches the save.
  watch(store, 2);
  store.draw(() => 0.5);
  assert.equal(storage.getItem("kuvert:v4"), broken);
  assert.equal(store.dirty, true, "the page warns before closing with unsaved changes");

  // Restoring a backup takes over; the spare copy stays.
  const other = setup();
  watch(other.store, 3, 10);
  store.restore(validateProgress(other.store.data(), store.catalog.ctx), "replace");
  assert.equal(store.writeLocked, false);
  assert.deepEqual(JSON.parse(storage.getItem("kuvert:v4")).seen.sort(), [...other.store.p.seen].sort());
  assert.equal(storage.getItem("kuvert:unreadable:kuvert:v4"), broken);
});

test("starting fresh saves again, and the unreadable save is still kept aside", () => {
  const { storage, store } = setup({ "kuvert:v4": "not json" });
  store.startFresh();
  watch(store, 1);
  assert.equal(JSON.parse(storage.getItem("kuvert:v4")).seen.length, 1);
  assert.equal(storage.getItem("kuvert:unreadable:kuvert:v4"), "not json");
});

test("sync stays off while the save is unreadable, so the empty stand-in never reaches the gist", async () => {
  const { store, storage } = setup({ "kuvert:v4": "{broken", "kuvert:sync": JSON.stringify({ token: "t", gistId: "g", last: {} }) });
  let calls = 0;
  const sync = new Sync({ store, storage, fetch: async () => (calls++, new Response("{}")) });
  assert.equal(sync.on, true);
  assert.equal(await sync.syncNow(), null);
  assert.equal(calls, 0);
});

test("no reminder before you've watched a few films", () => {
  const { store, keep } = setup();
  watch(store, REMIND.minWatched - 1);
  assert.equal(keep.reminder(NOW.getTime()), null);
  watch(store, 1, 5);
  assert.match(keep.reminder(NOW.getTime()), /live only in this browser/);
});

test("a fresh copy quiets the reminder until enough films or days go by", () => {
  const { store, keep } = setup();
  watch(store, 4);
  store.recordBackup(store.data(), "download"); // any copy: file, download or share sheet
  assert.equal(keep.reminder(NOW.getTime()), null, "up to date");
  watch(store, REMIND.films - 1, 20);
  assert.equal(keep.reminder(NOW.getTime()), null, "a few new films isn't enough yet");
  watch(store, 1, 40);
  assert.equal(keep.reminder(NOW.getTime()), `You've watched ${REMIND.films} films since your last copy.`);
});

test("an old copy is mentioned after two weeks, even with few new films", () => {
  const { store, keep } = setup();
  watch(store, 4);
  store.recordBackup(store.data(), "download");
  watch(store, 1, 30);
  assert.equal(keep.reminder(NOW.getTime() + (REMIND.days - 1) * DAY), null);
  assert.equal(keep.reminder(NOW.getTime() + REMIND.days * DAY), `Your last copy is ${REMIND.days} days old.`);
});

test("Not now snoozes; sync or a kept-up-to-date file means no reminder at all", () => {
  const { store, keep, files, sync } = setup();
  watch(store, 6);
  keep.snooze(NOW.getTime());
  assert.equal(keep.reminder(NOW.getTime() + DAY), null);
  assert.ok(keep.reminder(NOW.getTime() + REMIND.snoozeDays * DAY + 1));
  files.handle = { name: "kuvert-progress.json" };
  assert.equal(keep.reminder(NOW.getTime() + 30 * DAY), null);
  files.handle = null;
  Object.assign(sync, { on: true, last: { at: NOW.toISOString() } });
  assert.equal(keep.reminder(NOW.getTime() + 30 * DAY), null);
  sync.error = "Bad credentials";
  assert.ok(keep.reminder(NOW.getTime() + 30 * DAY), "a broken sync doesn't count as a copy");
});
