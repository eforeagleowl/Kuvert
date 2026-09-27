// Group night: friends' codes in, and a draw that only picks films none of you has seen.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveList } from "../../js/data/lists.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { Store } from "../../js/state/store.js";
import { Group, readFriend } from "../../js/state/group.js";
import { encodeLegacy } from "../../js/compat/legacy-code.js";
import { LOCAL_LEGACY_IDS } from "../../js/compat/legacy-ids.js";
import { MemoryStorage } from "./helpers.mjs";

const golden = JSON.parse(readFileSync(new URL("../fixtures/golden.json", import.meta.url), "utf8"));

function setup(entries = {}) {
  const storage = new MemoryStorage(entries);
  const list = resolveList(storage);
  const store = new Store({ list, catalog: makeCatalog(list), storage, now: () => new Date("2026-09-27T20:00:00") });
  store.load();
  return { storage, store, group: new Group({ storage, store }) };
}
// A friend's code, made the way their Kuvert makes it.
function codeFor(ids) {
  const { store } = setup();
  for (const id of ids) store.markSeen(id, true);
  return store.code();
}

test("reads a friend's KU7 code, an older code and a backup file", () => {
  const { store } = setup();
  const ids = store.catalog.films.slice(0, 5).map((f) => f.id);
  assert.deepEqual(readFriend(codeFor(ids), store.catalog.ctx).sort(), [...ids].sort());
  const file = golden.builtin.full.file; // a backup file made by Kuvert Classic
  assert.equal(readFriend(typeof file === "string" ? file : JSON.stringify(file), store.catalog.ctx).length, golden.builtin.full.data.seen.length);
  assert.equal(readFriend(golden.builtin.full.code, store.catalog.ctx).length, golden.builtin.full.data.seen.length);
  const legacy = encodeLegacy(new Set(LOCAL_LEGACY_IDS.slice(0, 4)), LOCAL_LEGACY_IDS);
  assert.equal(readFriend(legacy, store.catalog.ctx).length, 4, "old base-36 codes read as the updated list");
  assert.throws(() => readFriend("", store.catalog.ctx), /Paste their progress code/);
  assert.throws(() => readFriend("KU7.garbage.00000000", store.catalog.ctx));
});

test("the draw leaves out every film anyone in the group has seen, only while it's on", () => {
  const { store, group } = setup();
  const films = store.catalog.films.filter((f) => !f.tri);
  const anna = films.slice(0, 40).map((f) => f.id),
    bo = films.slice(30, 90).map((f) => f.id);
  const all = store.units().length;
  group.add("Anna", codeFor(anna));
  group.add("Bo", codeFor(bo));
  const left = store.units().map((u) => u.film.id);
  assert.equal(left.length, all - 90);
  assert.ok(!left.some((id) => anna.includes(id) || bo.includes(id)));
  for (let i = 0; i < 25; i++) {
    const r = store.draw(() => i / 25);
    assert.ok(!anna.includes(r.film.id) && !bo.includes(r.film.id));
  }
  assert.deepEqual(group.seenBy(films[35].id), ["Anna", "Bo"]);
  group.setOn(false);
  assert.equal(store.units().length, all);
});

test("a series waits while someone has seen the part you're on", () => {
  const { store, group } = setup();
  const [first, second] = store.catalog.seriesParts("gf");
  group.add("Anna", codeFor([first.id])); // Anna saw part 1, you haven't
  const units = store.units().map((u) => u.film.id);
  assert.ok(!units.includes(first.id) && !units.includes(second.id), "you start with part 1, which Anna has seen");
});

test("your own watched films still count, and friends are kept per list and survive a reload", () => {
  const { storage, store, group } = setup();
  const mine = store.catalog.films[0].id;
  store.markSeen(mine, true);
  group.add("", codeFor([store.catalog.films[1].id]));
  assert.equal(group.people[0].name, "Friend 1");
  assert.ok(!store.units().some((u) => u.film.id === mine));
  const again = new Group({ storage, store });
  assert.equal(again.on, true);
  assert.deepEqual(again.people.map((x) => x.name), ["Friend 1"]);
  assert.ok(storage.getItem("kuvert:group:builtin"));
  // Adding the same name again refreshes that friend instead of adding a second one.
  const r = again.add("friend 1", codeFor([store.catalog.films[2].id, store.catalog.films[3].id]));
  assert.equal(r.refreshed, true);
  assert.equal(again.people.length, 1);
  assert.equal(again.people[0].seen.length, 2);
  again.remove(0);
  assert.equal(again.on, false);
  assert.equal(storage.getItem("kuvert:group:builtin"), null);
  assert.equal(store.exclude, null);
});

test("group night never reaches your progress, backups or codes", () => {
  const { store, group } = setup();
  const before = store.code();
  group.add("Anna", codeFor(store.catalog.films.slice(0, 10).map((f) => f.id)));
  assert.equal(store.code(), before);
  assert.equal(JSON.stringify(store.data()).includes("Anna"), false);
});
