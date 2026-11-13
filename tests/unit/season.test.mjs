// An envelope with a season leads the shelf while it lasts (js/views/journeys.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CURATED_COLLECTIONS } from "../../js/data/curated.js";
import { inSeason, shelfOrder } from "../../js/views/journeys.js";

const christmas = CURATED_COLLECTIONS.find((c) => c.id === "curated-christmas");
const on = (day) => new Date(day + "T12:00:00");

test("the Christmas envelope is in season from November to Epiphany, across the new year", () => {
  assert.deepEqual(christmas.season, { from: [11, 1], to: [1, 6] });
  for (const day of ["2026-11-01", "2026-11-13", "2026-12-24", "2026-12-31", "2027-01-01", "2027-01-06"]) assert.equal(inSeason(christmas, on(day)), true, day);
  for (const day of ["2026-10-31", "2027-01-07", "2027-03-15", "2027-07-01"]) assert.equal(inSeason(christmas, on(day)), false, day);
  // An envelope without a season never is; a season within one year works too.
  assert.equal(inSeason(CURATED_COLLECTIONS[0], on("2026-12-24")), false);
  const summer = { season: { from: [6, 1], to: [8, 31] } };
  assert.deepEqual(["2026-05-31", "2026-06-01", "2026-08-31", "2026-09-01"].map((d) => inSeason(summer, on(d))), [false, true, true, false]);
});

test("in season it leads the shelf; out of season the shelf is in its own order", () => {
  const names = (day) => shelfOrder(CURATED_COLLECTIONS, on(day)).map((c) => c.id);
  assert.deepEqual(names("2026-12-10"), ["curated-christmas", "curated-noir", "curated-swedish-winter", "curated-silent", "curated-hitchcock"]);
  assert.deepEqual(names("2027-04-10"), ["curated-noir", "curated-swedish-winter", "curated-silent", "curated-hitchcock", "curated-christmas"]);
  assert.equal(shelfOrder(CURATED_COLLECTIONS, on("2026-12-10")).length, CURATED_COLLECTIONS.length);
});

test("the Christmas envelope: seven films, each with its note, none shared with another envelope", () => {
  assert.deepEqual(christmas.films.map((f) => f.id), ["1940-the-shop-around-the-corner", "1944-meet-me-in-st-louis", "1946-it-s-a-wonderful-life", "1947-miracle-on-34th-street", "1960-the-apartment", "2015-carol", "2023-the-holdovers"]);
  const elsewhere = new Set(CURATED_COLLECTIONS.filter((c) => c !== christmas).flatMap((c) => c.films.map((f) => f.id)));
  assert.deepEqual(christmas.films.filter((f) => elsewhere.has(f.id)), []);
  assert.deepEqual([christmas.title.sv, christmas.palette, christmas.art, christmas.badge], ["Julkuvertet", "falu", "jul", "JUL"]);
});
