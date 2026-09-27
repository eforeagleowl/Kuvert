// Sync between two devices through a pretend GitHub Gist.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveList } from "../../next/js/data/lists.js";
import { makeCatalog } from "../../next/js/state/catalog.js";
import { Store } from "../../next/js/state/store.js";
import { Sync } from "../../next/js/storage/sync.js";
import { MemoryStorage } from "./helpers.mjs";

// A tiny in-memory GitHub: just the gist endpoints Kuvert uses.
function fakeGitHub() {
  const gists = new Map();
  let n = 0;
  const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });
  return async (url, { method = "GET", body } = {}) => {
    const u = new URL(url);
    if (u.pathname === "/gists" && method === "GET") return json([...gists.values()]);
    if (u.pathname === "/gists" && method === "POST") {
      const id = "g" + ++n,
        b = JSON.parse(body);
      const g = { id, files: Object.fromEntries(Object.entries(b.files).map(([k, v]) => [k, { content: v.content }])) };
      gists.set(id, g);
      return json(g, 201);
    }
    const m = u.pathname.match(/^\/gists\/(\w+)$/);
    const g = m && gists.get(m[1]);
    if (!g) return json({}, 404);
    if (method === "PATCH") for (const [k, v] of Object.entries(JSON.parse(body).files)) g.files[k] = { content: v.content };
    return json(g);
  };
}

let clock = Date.parse("2026-09-26T19:00:00Z");
const tick = () => new Date((clock += 60000));
function device(fetch) {
  const storage = new MemoryStorage();
  const list = resolveList(storage);
  const store = new Store({ list, catalog: makeCatalog(list), storage, now: tick });
  store.load();
  return { store, sync: new Sync({ store, storage, fetch }) };
}

test("two devices stay in step, and an un-mark sticks through a merge", async () => {
  const fetch = fakeGitHub();
  const a = device(fetch),
    b = device(fetch);
  await a.sync.connect("token");
  await b.sync.connect("token");
  assert.equal(a.sync.cfg.gistId, b.sync.cfg.gistId, "both find the same gist");

  a.store.markSeen("1942-casablanca", true);
  a.store.markSeen("1927-wings", true);
  await a.sync.syncNow(); // upload
  // B has never synced, so it merges (as in the original app); nothing of its own to lose.
  const pulled = await b.sync.syncNow();
  assert.equal(pulled.applied, "merge");
  assert.ok(b.store.p.seen.has("1942-casablanca") && b.store.p.seen.has("1927-wings"));

  // Both change before syncing: A un-marks Wings, B rates Casablanca and watches Rocky.
  a.store.markSeen("1927-wings", false);
  b.store.rate("1942-casablanca", 5);
  b.store.markSeen("1976-rocky", true);
  await a.sync.syncNow(); // upload A's change
  const merged = await b.sync.syncNow(); // both changed: merge
  assert.equal(merged.applied, "merge");
  assert.ok(!b.store.p.seen.has("1927-wings"), "Wings stays un-marked");
  assert.equal(b.store.p.reviews["1942-casablanca"].rating, 5);
  assert.ok(b.store.p.seen.has("1976-rocky"));
  const back = await a.sync.syncNow(); // only B changed since A's last sync: A takes it
  assert.equal(back.applied, "replace");
  assert.deepEqual([...a.store.p.seen].sort(), [...b.store.p.seen].sort(), "A ends up the same");
});

test("sync errors read like the original app's", async () => {
  const s = device(async () => ({ ok: false, status: 401, json: async () => ({}) }));
  await assert.rejects(s.sync.connect("bad"), { message: "GitHub didn't accept that token. Check it hasn't expired." });
});
