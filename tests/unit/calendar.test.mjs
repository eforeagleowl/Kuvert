// The Swedish calendar the dala horse keeps (js/state/calendar.js): which days it dresses for.
import { test } from "node:test";
import assert from "node:assert/strict";
import { midsummerEve, occasion } from "../../js/state/calendar.js";

const at = (when) => occasion(new Date(when))?.id ?? null;

test("Midsummer Eve is the Friday between 19 and 25 June", () => {
  const eves = { 2023: 23, 2024: 21, 2025: 20, 2026: 19, 2027: 25, 2028: 23, 2029: 22, 2030: 21, 2031: 20, 2032: 25 };
  for (const [year, day] of Object.entries(eves)) {
    const eve = midsummerEve(Number(year));
    assert.deepEqual([eve.getFullYear(), eve.getMonth() + 1, eve.getDate(), eve.getDay()], [Number(year), 6, day, 5], year);
  }
  // Every year for a century: a Friday, in June, from the 19th to the 25th.
  for (let year = 2000; year < 2100; year++) {
    const eve = midsummerEve(year);
    assert.ok(eve.getDay() === 5 && eve.getMonth() === 5 && eve.getDate() >= 19 && eve.getDate() <= 25, year + ": " + eve);
  }
});

test("the horse dresses for Lucia, for Christmas and for Midsummer, and for nothing else", () => {
  // Lucia is the 13th of December.
  assert.deepEqual(occasion(new Date("2026-12-13T08:00:00")), { id: "lucia", greeting: "Glad Lucia!" });
  assert.deepEqual(["2026-12-12T23:00:00", "2026-12-13T19:30:00", "2026-12-14T12:00:00"].map(at), [null, "lucia", null]);
  // Christmas Eve, Christmas Day and the day after.
  assert.deepEqual(occasion(new Date("2026-12-24T15:00:00")), { id: "jul", greeting: "God jul!" });
  assert.deepEqual(["2026-12-23T23:00:00", "2026-12-24T07:00:00", "2026-12-25T12:00:00", "2026-12-26T23:30:00", "2026-12-27T12:00:00"].map(at), [null, "jul", "jul", "jul", null]);
  // Midsummer Eve and Midsummer Day, whichever dates they fall on that year.
  assert.deepEqual(occasion(new Date("2026-06-19T18:00:00")), { id: "midsommar", greeting: "Glad midsommar!" });
  assert.deepEqual(["2026-06-18T20:00:00", "2026-06-19T10:00:00", "2026-06-20T22:00:00", "2026-06-21T12:00:00"].map(at), [null, "midsommar", "midsommar", null]);
  assert.deepEqual(["2027-06-19T12:00:00", "2027-06-24T12:00:00", "2027-06-25T12:00:00", "2027-06-26T12:00:00", "2027-06-27T12:00:00"].map(at), [null, null, "midsommar", "midsommar", null]);
  // Ordinary days, the rest of the year.
  for (const day of ["2026-11-16T19:00:00", "2026-01-01T12:00:00", "2026-04-30T20:00:00", "2026-06-06T12:00:00", "2026-12-31T23:00:00"]) assert.equal(at(day), null, day);
});

test("the horse's day is Kuvert's: it lasts until four in the morning", () => {
  // The small hours belong to the evening before.
  assert.deepEqual(["2026-12-13T03:00:00", "2026-12-14T02:30:00", "2026-12-14T04:00:00"].map(at), [null, "lucia", null]);
  assert.deepEqual(["2026-12-24T03:59:00", "2026-12-27T02:00:00", "2026-12-27T04:30:00"].map(at), [null, "jul", null]);
  assert.deepEqual(["2026-06-19T01:00:00", "2026-06-21T01:00:00", "2026-06-21T05:00:00"].map(at), [null, "midsommar", null]);
});
