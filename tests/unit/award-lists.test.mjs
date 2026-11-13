// Award lists (js/data/award-lists.js): every winner of one prize as a list of its own. The first is the
// British Academy's Best Film.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./helpers.mjs";
import { AWARD_LISTS } from "../../js/data/award-lists.js";
import { BAFTA_WINNERS } from "../../js/data/bafta.js";
import { AWARDS, awardFor } from "../../js/data/awards.js";
import { FILM_TABLE } from "../../js/data/films.js";
import { buildListDefinition, readCustomLists, writeCustomLists, resolveList, supersede } from "../../js/data/lists.js";
import { validateProgress } from "../../js/compat/validate.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { Store } from "../../js/state/store.js";
import { carryWatched, listRecords, watchedAcross } from "../../js/state/shared.js";
import { KEYS } from "../../js/compat/keys.js";
import { upgradeCurated } from "../../js/views/journeys.js";
import { galaFilms } from "../../js/fun/gala.js";
import { validateCatalogue } from "../../tools/catalogue-check.mjs";

const bafta = AWARD_LISTS.find((l) => l.id === "bafta");
const [GANDHI, HUSTLER, BALLAD, APARTMENT, FELLOWSHIP] = ["1982-gandhi", "1961-the-hustler", "1959-ballad-of-a-soldier", "1960-the-apartment", "2001-the-lord-of-the-rings-the-fellowship-of-the-ring"];

function install(storage, list, version = list.version) {
  const lists = readCustomLists(storage);
  lists[list.id] = { ...buildListDefinition(list), version };
  writeCustomLists(storage, lists);
}
function open(storage, listId) {
  storage.setItem(KEYS.activeList, listId);
  const list = resolveList(storage);
  const catalog = makeCatalog(list);
  const store = new Store({ list, catalog, storage, now: () => new Date("2026-11-13T20:00:00Z") });
  store.load();
  const app = { list, catalog, store, storage, toast: { shown: [], show(m) { this.shown.push(m); } } };
  app.came = carryWatched(app);
  return app;
}

test("BAFTA Best Film: 79 ceremonies, 80 winners, each a film in the table", () => {
  assert.equal(BAFTA_WINNERS.length, 79);
  assert.deepEqual(BAFTA_WINNERS.map(([c]) => c), Array.from({ length: 79 }, (_, i) => i + 1), "one row per ceremony, in order");
  assert.equal(bafta.films.length, 80);
  assert.equal(new Set(bafta.films.map((f) => f.id)).size, 80, "no film twice");
  assert.deepEqual([bafta.ceremonies, bafta.firstYear, bafta.lastYear], [79, 1947, 2025]);
  for (const f of bafta.films) {
    assert.ok(FILM_TABLE[f.id], f.id + " is in the film table");
    assert.deepEqual([f.t, f.y, f.s], [FILM_TABLE[f.id].t, FILM_TABLE[f.id].y, "W"]);
  }
  // The 15th ceremony had two winners.
  assert.deepEqual(bafta.films.filter((f) => f.c === 15).map((f) => f.id), [BALLAD, HUSTLER]);
  assert.deepEqual([bafta.films[0].id, bafta.films.at(-1).id], ["1946-the-best-years-of-our-lives", "2025-one-battle-after-another"]);
  // Most of them were on an Academy ballot too, so progress in Kuvert's own list and in Galan carries over.
  const ballots = new Set(galaFilms().map((f) => f.id));
  assert.equal(bafta.films.filter((f) => ballots.has(f.id)).length, 63);
});

test("the list installs through the normal list format, and follows its own award", () => {
  const def = buildListDefinition(bafta);
  assert.deepEqual([def.id, def.name, def.award, def.palette, def.films.length], ["bafta", "BAFTA Best Film", "bafta", "natt", 80]);
  assert.equal(def.subtitle, bafta.subtitle.en, "the list keeps the English subtitle");
  assert.deepEqual(def.shelves, { W: { chip: "Won", label: "Best Film winner", plural: "Winners", winner: true } });
  assert.deepEqual(def.films.map((f) => f.id), bafta.films.map((f) => f.id), "film ids are the table's, unchanged");
  assert.deepEqual(def.series, {}, "no series: only two of the three Lord of the Rings films won");
  assert.equal("tri" in def.films.find((f) => f.id === FELLOWSHIP), false);

  const storage = new MemoryStorage();
  install(storage, bafta);
  const { list, catalog } = open(storage, "bafta");
  assert.equal(awardFor(list), AWARDS.bafta);
  assert.deepEqual([catalog.prize, catalog.award.trophy, catalog.award.event], ["Best Film", "BAFTA", "British Academy Film Awards"]);
  assert.equal(catalog.isWinner(catalog.byId.get(GANDHI)), true);
  assert.equal(catalog.oscarLine(catalog.byId.get(GANDHI)), "Won at the 36th British Academy Film Awards.");
  // A tied year reads as a shared prize, not as one winner beating the other.
  assert.equal(catalog.oscarLine(catalog.byId.get(HUSTLER)), "Shared the prize with Ballad of a Soldier at the 15th British Academy Film Awards.");
  assert.equal(catalog.oscarLine(catalog.byId.get(BALLAD)), "Shared the prize with The Hustler at the 15th British Academy Film Awards.");
  assert.equal(catalog.seriesParts("lotr").length, 0);
  // The built-in list still follows the Oscars.
  assert.equal(makeCatalog(resolveList(new MemoryStorage())).oscarLine({ id: "1976-rocky", t: "Rocky", y: 1976, s: "W", c: 49 }).endsWith("at the 49th Academy Awards."), true);
});

test("a film watched in Kuvert's own list is watched in the BAFTA list, and the other way round", () => {
  const storage = new MemoryStorage();
  let app = open(storage, "builtin");
  app.store.markSeen(APARTMENT, true, { date: "2026-02-14" });
  app.store.rate(APARTMENT, 5);
  // The card counts it before the list has ever been opened…
  const across = watchedAcross(listRecords(storage, { id: app.list.id, p: app.store.p }), "bafta");
  assert.equal(bafta.films.filter((f) => across.has(f.id)).length, 1);
  // …and opening the list brings it in, with its date and its stars.
  install(storage, bafta);
  app = open(storage, "bafta");
  assert.equal(app.came, 1);
  assert.equal(app.toast.shown[0], "1 film came along from Kuvert.");
  assert.deepEqual([app.store.p.dates[APARTMENT], app.store.p.reviews[APARTMENT].rating], ["2026-02-14", 5]);
  // Gandhi, watched here, is watched in the main list too.
  app.store.markSeen(GANDHI, true);
  app = open(storage, "builtin");
  assert.equal(app.store.p.seen.has(GANDHI), true);
});

test("an installed copy grows with the list when a ceremony is added, and keeps its progress", () => {
  const storage = new MemoryStorage();
  // As it will be a year from now: this year's copy is installed, and the list has one more winner.
  const next = { ...bafta, version: bafta.version + 1, films: [...bafta.films, { t: "Next Year's Winner", y: 2026, s: "W", c: 80, id: "2026-next-year-s-winner" }] };
  install(storage, bafta);
  let app = open(storage, "bafta");
  assert.equal(app.catalog.films.length, 80);
  app.store.markSeen(GANDHI, true);
  upgradeCurated(storage);
  assert.equal(readCustomLists(storage).bafta.films.length, 80, "nothing to do while the versions agree");
  upgradeCurated(storage, [next]);
  const def = readCustomLists(storage).bafta;
  assert.deepEqual([def.version, def.films.length, def.award, def.films.at(-1).c], [next.version, 81, "bafta", 80]);
  assert.deepEqual(def.shelves, buildListDefinition(bafta).shelves, "its own shelf label stays");
  // A longer list has a new catalogue name. It remembers the one it had, and its save has taken the new one.
  assert.deepEqual([def.catalogue, def.olderCatalogues], ["custom:bafta:81", ["custom:bafta:80"]]);
  assert.equal(JSON.parse(storage.getItem(KEYS.list("bafta"))).catalogue, "custom:bafta:81");
  app = open(storage, "bafta");
  assert.equal(app.store.writeLocked, false);
  assert.equal(app.catalog.films.length, 81);
  assert.equal(app.store.p.seen.has(GANDHI), true, "Gandhi is still watched");
  // A backup made before the list grew still restores into it; one from a different list still doesn't.
  const before = { app: "kuvert", v: 7, catalogue: "custom:bafta:80", saved: null, seen: [GANDHI, APARTMENT], dates: {}, current: null, skipped: [], reviews: {}, recent: [], moods: {}, runtimes: {}, rankings: [], verdicts: {}, lbx: {}, matches: {}, shelf: [], snubs: {} };
  assert.deepEqual([...validateProgress(before, app.catalog.ctx).seen].sort(), [APARTMENT, GANDHI].sort());
  assert.throws(() => validateProgress({ ...before, catalogue: "custom:other:80" }, app.catalog.ctx), /different movie list/);
});

test("a save that could not be renamed is still read, by the name the list had before", () => {
  const storage = new MemoryStorage();
  const next = { ...bafta, version: bafta.version + 1, films: [...bafta.films, { t: "Next Year's Winner", y: 2026, s: "W", c: 80, id: "2026-next-year-s-winner" }] };
  install(storage, bafta);
  open(storage, "bafta").store.markSeen(GANDHI, true);
  // The list is rebuilt, but the save keeps its old name (as if that write had failed).
  const lists = readCustomLists(storage);
  lists.bafta = supersede(lists.bafta, { ...buildListDefinition(next), version: next.version });
  writeCustomLists(storage, lists);
  assert.equal(JSON.parse(storage.getItem(KEYS.list("bafta"))).catalogue, "custom:bafta:80");
  const app = open(storage, "bafta");
  assert.equal(app.store.writeLocked, false);
  assert.equal(app.store.p.seen.has(GANDHI), true);
  // Nothing to remember when a rebuilt list keeps its length (an envelope that swapped one film for another).
  assert.equal("olderCatalogues" in supersede(buildListDefinition(bafta), buildListDefinition(bafta)), false);
});

test("validation catches a missing ceremony, a film nobody has entered, and a winner with a series", () => {
  const broken = (change) => {
    const lists = structuredClone(AWARD_LISTS);
    change(lists[0]);
    return validateCatalogue({ awardLists: lists }).errors;
  };
  assert.deepEqual(validateCatalogue().errors.filter((e) => e.startsWith("bafta")), []);
  assert.ok(broken((l) => { l.films = l.films.filter((f) => f.c !== 40); }).some((e) => e.includes("ceremonies must run from the 1st")));
  assert.ok(broken((l) => { l.films[3] = { ...l.films[3], id: "1950-not-a-film", t: "Not a Film" }; }).some((e) => e.includes("1950-not-a-film: listed, but not in the film table")));
  assert.ok(broken((l) => { l.films[3].tri = "lotr"; l.films[3].ord = 1; }).some((e) => e.includes("carries a series")));
  assert.ok(broken((l) => { l.award = "nobel"; }).some((e) => e.includes("unknown award or palette")));
  assert.ok(broken((l) => { l.films[10].s = "N"; }).some((e) => e.includes("is not marked as a winner")));
});
