// The film year in review (js/state/year.js): which year, and what it held.
import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewYears, pickYear, yearReview } from "../../js/state/year.js";

const film = (t, y, date, rating = null, runtime = 100, rank = 0) => ({ t, y, date, rating, runtime, rank });
const records = [
  film("Sunrise", 1927, "2026-01-03", 4.5, 94, 2),
  film("Rocky", 1976, "2026-03-10", 4, 120, 5),
  film("Heat", 1995, "2026-03-11", 5, 171, 1),
  film("Marty", 1955, "2026-03-12", 4.5, 90, 3),
  film("Fargo", 1996, "2026-03-20", null, 98),
  film("Jaws", 1975, "2026-07-01", 3, 124, 9),
  film("Alien", 1979, "2026-07-01", 4, 117, 4),
  film("Giant", 1956, "2025-12-30", 5, 201, 6),
  film("Undated", 1960, "", 5, 100, 7),
];

test("the years with a dated watch, and which one to review", () => {
  assert.deepEqual(reviewYears(records), [2026, 2025]);
  assert.equal(pickYear([2026, 2025], new Date(2026, 10, 14)), 2026);
  assert.equal(pickYear([2026, 2025], new Date(2027, 0, 5)), 2026, "in January, the year that just ended");
  assert.equal(pickYear([2027, 2026], new Date(2027, 1, 5)), 2027);
  assert.equal(pickYear([2025], new Date(2027, 5, 1)), 2025, "nothing this year: the latest year with a watch");
  assert.equal(pickYear([], new Date()), null);
});

test("a year in review: films, time, evenings, the longest run, the busiest month, the oldest film and the best five", () => {
  const r = yearReview(records, 2026);
  assert.deepEqual([r.films, r.minutes, r.evenings, r.run, r.rated], [7, 814, 6, 3, 6]);
  assert.deepEqual(r.busiest, { month: 2, films: 4 }, "March");
  assert.equal(r.oldest.t, "Sunrise");
  // By stars; equal stars go by the ranking.
  assert.deepEqual(r.top.map((f) => f.t), ["Heat", "Sunrise", "Marty", "Alien", "Rocky"]);
  assert.deepEqual(yearReview(records, 2025).top.map((f) => f.t), ["Giant"]);
});

test("with no stars, the latest films stand in; an empty year is empty", () => {
  const plain = records.map((r) => ({ ...r, rating: null }));
  assert.deepEqual(yearReview(plain, 2026).top.map((f) => f.t), ["Alien", "Jaws", "Fargo", "Marty", "Heat"]);
  const none = yearReview(records, 2019);
  assert.deepEqual([none.films, none.evenings, none.run, none.busiest, none.oldest, none.top], [0, 0, 0, null, null, []]);
});
