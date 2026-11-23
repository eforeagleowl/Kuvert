// What Kuvert remembers when a day comes round (js/state/memory.js): the film watched on this day in an
// earlier year, and the day of the first film, which the dala horse keeps as its own.
import { test } from "node:test";
import assert from "node:assert/strict";
import { yearsAgo, onThisDay, firstFilm, ownDay } from "../../js/state/memory.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { resolveList } from "../../js/data/lists.js";
import { MemoryStorage } from "./helpers.mjs";

const catalog = makeCatalog(resolveList(new MemoryStorage()));
const [a, b, c, d] = catalog.films;
/** Progress with these films watched: [film, date or null, stars or none]. */
function watched(...films) {
  const p = { seen: new Set(), dates: {}, reviews: {} };
  for (const [film, date, rating] of films) {
    p.seen.add(film.id);
    if (date) p.dates[film.id] = date;
    if (rating) p.reviews[film.id] = { rating };
  }
  return p;
}
const at = (when) => new Date(when);

test("a day comes round on the same month and day of a later year", () => {
  assert.equal(yearsAgo("2025-11-23", "2026-11-23"), 1);
  assert.equal(yearsAgo("2021-11-23", "2026-11-23"), 5);
  // Not the day itself, not the day before or after, and never a day yet to come.
  assert.deepEqual(["2026-11-23", "2025-11-22", "2025-11-24", "2025-10-23", "2027-11-23"].map((day) => yearsAgo(day, "2026-11-23")), [0, 0, 0, 0, 0]);
  // The 29th of February comes round on the 28th in a year without one, and on the 29th in a year with.
  assert.equal(yearsAgo("2024-02-29", "2025-02-28"), 1);
  assert.equal(yearsAgo("2024-02-29", "2028-02-29"), 4);
  assert.equal(yearsAgo("2024-02-29", "2028-02-28"), 0);
  assert.equal(yearsAgo("2024-02-28", "2025-02-28"), 1);
});

test("on this day: the film watched when this evening last came round", () => {
  const evening = at("2026-11-23T19:30:00");
  assert.equal(onThisDay(watched(), catalog, evening), null);
  // Watched this year, on other days, or with no date: nothing to remember.
  assert.equal(onThisDay(watched([a, "2026-11-23", 5], [b, "2025-11-22", 5], [c, null, 5]), catalog, evening), null);
  assert.deepEqual(onThisDay(watched([a, "2025-11-23", 4.5]), catalog, evening), { film: a, years: 1, rating: 4.5, more: 0 });
  // No stars: remembered all the same.
  assert.deepEqual(onThisDay(watched([a, "2023-11-23"]), catalog, evening), { film: a, years: 3, rating: null, more: 0 });
  // The nearest year wins; within it the film rated highest, and the others that evening are counted.
  const several = watched([a, "2022-11-23", 5], [b, "2025-11-23", 3], [c, "2025-11-23", 4], [d, "2025-11-23"]);
  assert.deepEqual(onThisDay(several, catalog, evening), { film: c, years: 1, rating: 4, more: 2 });
  // Kuvert's evening lasts until four: at two in the morning it is still the 23rd, at five it is the 24th.
  assert.equal(onThisDay(watched([a, "2025-11-23", 4]), catalog, at("2026-11-24T02:00:00")).film, a);
  assert.equal(onThisDay(watched([a, "2025-11-23", 4]), catalog, at("2026-11-24T05:00:00")), null);
  assert.equal(onThisDay(watched([a, "2025-11-23", 4]), catalog, at("2026-11-23T03:00:00")), null);
});

test("the horse's own day: the day of your first film here, every year after", () => {
  const p = watched([a, "2025-11-23", 4], [b, "2024-03-02"], [c, "2026-01-10"], [d, null]);
  // The first film is the one with the earliest date, wherever it is in the list; undated ones don't count.
  assert.deepEqual(firstFilm(p, catalog), { film: b, date: "2024-03-02" });
  assert.equal(firstFilm(watched([d, null]), catalog), null);
  assert.equal(ownDay(p, catalog, at("2026-11-23T19:30:00")), null);
  assert.equal(ownDay(p, catalog, at("2024-03-02T19:30:00")), null, "the day itself is not an anniversary");
  assert.deepEqual(ownDay(p, catalog, at("2025-03-02T19:30:00")), { years: 1, films: 4, first: b, greeting: "Ett år och 4 filmer!" });
  assert.deepEqual(ownDay(p, catalog, at("2027-03-03T01:00:00")), { years: 3, films: 4, first: b, greeting: "3 år och 4 filmer!" });
  assert.equal(ownDay(p, catalog, at("2027-03-03T09:00:00")), null);
  assert.equal(ownDay(watched([a, "2025-11-23"]), catalog, at("2026-11-23T12:00:00")).greeting, "Ett år och 1 film!");
  assert.equal(ownDay(watched(), catalog, at("2026-11-23T12:00:00")), null);
});
