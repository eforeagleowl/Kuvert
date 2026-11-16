// The Swedish calendar the dala horse keeps (js/state/calendar.js): which days it dresses for.
import { test } from "node:test";
import assert from "node:assert/strict";
import { easterSunday, midsummerEve, occasion } from "../../js/state/calendar.js";

const at = (when) => occasion(new Date(when))?.id ?? null;
const ymd = (d) => [d.getFullYear(), d.getMonth() + 1, d.getDate()].join("-");

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

test("Easter Sunday falls where the almanac puts it", () => {
  // Years from the almanac, among them the earliest and latest Easters there are (22 March 1818 and 2285,
  // 25 April 1943 and 2038) and the years the shorter rules of thumb get wrong (1954, 1981, 2019, 2049).
  const easters = ["1818-3-22", "1943-4-25", "1954-4-18", "1981-4-19", "2000-4-23", "2008-3-23", "2011-4-24", "2019-4-21", "2024-3-31", "2025-4-20", "2026-4-5", "2027-3-28", "2028-4-16", "2029-4-1", "2030-4-21", "2038-4-25", "2049-4-18", "2285-3-22"];
  for (const day of easters) assert.equal(ymd(easterSunday(Number(day.split("-")[0]))), day);
  // Every year for three centuries: a Sunday, from 22 March to 25 April.
  for (let year = 1900; year < 2200; year++) {
    const easter = easterSunday(year),
      md = (easter.getMonth() + 1) * 100 + easter.getDate();
    assert.ok(easter.getDay() === 0 && md >= 322 && md <= 425, year + ": " + easter);
  }
});

test("the horse dresses for nine days of the Swedish year, and for nothing else", () => {
  // Easter, from Maundy Thursday to Easter Monday, wherever it falls that year.
  assert.deepEqual(occasion(new Date("2026-04-05T12:00:00")), { id: "pask", greeting: "Glad påsk!" });
  assert.deepEqual(["2026-04-01T20:00:00", "2026-04-02T09:00:00", "2026-04-03T12:00:00", "2026-04-04T18:00:00", "2026-04-05T12:00:00", "2026-04-06T23:00:00", "2026-04-07T12:00:00"].map(at), [null, "pask", "pask", "pask", "pask", "pask", null]);
  assert.deepEqual(["2027-03-24T12:00:00", "2027-03-25T12:00:00", "2027-03-29T12:00:00", "2027-03-30T12:00:00", "2027-04-05T12:00:00"].map(at), [null, "pask", "pask", null, null]);
  // An Easter that runs from March into April, across the change to summer time.
  assert.deepEqual(["2024-03-27T12:00:00", "2024-03-28T12:00:00", "2024-03-31T12:00:00", "2024-04-01T12:00:00", "2024-04-02T12:00:00"].map(at), [null, "pask", "pask", "pask", null]);
  // The latest Easter there is ends four days before Valborg: the two never meet.
  assert.deepEqual(["2038-04-22T12:00:00", "2038-04-26T12:00:00", "2038-04-27T12:00:00", "2038-04-30T12:00:00"].map(at), ["pask", "pask", null, "valborg"]);
  // Valborg is the last of April.
  assert.deepEqual(occasion(new Date("2026-04-30T21:00:00")), { id: "valborg", greeting: "Glad Valborg!" });
  assert.deepEqual(["2026-04-29T21:00:00", "2026-04-30T08:00:00", "2026-05-01T12:00:00"].map(at), [null, "valborg", null]);
  // The National Day is the sixth of June.
  assert.deepEqual(occasion(new Date("2026-06-06T12:00:00")), { id: "nationaldag", greeting: "Glad nationaldag!" });
  assert.deepEqual(["2026-06-05T21:00:00", "2026-06-06T08:00:00", "2026-06-07T12:00:00"].map(at), [null, "nationaldag", null]);
  // Midsummer Eve and Midsummer Day, whichever dates they fall on that year.
  assert.deepEqual(occasion(new Date("2026-06-19T18:00:00")), { id: "midsommar", greeting: "Glad midsommar!" });
  assert.deepEqual(["2026-06-18T20:00:00", "2026-06-19T10:00:00", "2026-06-20T22:00:00", "2026-06-21T12:00:00"].map(at), [null, "midsommar", "midsommar", null]);
  assert.deepEqual(["2027-06-19T12:00:00", "2027-06-24T12:00:00", "2027-06-25T12:00:00", "2027-06-26T12:00:00", "2027-06-27T12:00:00"].map(at), [null, null, "midsommar", "midsommar", null]);
  // The crayfish season runs from the seventh of August to the end of the month.
  assert.deepEqual(occasion(new Date("2026-08-07T18:00:00")), { id: "kraftskiva", greeting: "Skål!" });
  assert.deepEqual(["2026-08-06T21:00:00", "2026-08-07T08:00:00", "2026-08-19T20:00:00", "2026-08-31T23:00:00", "2026-09-01T12:00:00"].map(at), [null, "kraftskiva", "kraftskiva", "kraftskiva", null]);
  // Cinnamon bun day is the fourth of October, and Saint Bridget's the seventh.
  assert.deepEqual(occasion(new Date("2026-10-04T15:00:00")), { id: "kanelbulle", greeting: "Kanelbulle?" });
  assert.deepEqual(occasion(new Date("2026-10-07T15:00:00")), { id: "birgitta", greeting: "Grattis, Birgitta!" });
  assert.deepEqual(["2026-10-03T21:00:00", "2026-10-04T08:00:00", "2026-10-05T12:00:00", "2026-10-06T21:00:00", "2026-10-07T08:00:00", "2026-10-08T12:00:00"].map(at), [null, "kanelbulle", null, null, "birgitta", null]);
  // Lucia is the 13th of December.
  assert.deepEqual(occasion(new Date("2026-12-13T08:00:00")), { id: "lucia", greeting: "Glad Lucia!" });
  assert.deepEqual(["2026-12-12T23:00:00", "2026-12-13T19:30:00", "2026-12-14T12:00:00"].map(at), [null, "lucia", null]);
  // Christmas Eve, Christmas Day and the day after.
  assert.deepEqual(occasion(new Date("2026-12-24T15:00:00")), { id: "jul", greeting: "God jul!" });
  assert.deepEqual(["2026-12-23T23:00:00", "2026-12-24T07:00:00", "2026-12-25T12:00:00", "2026-12-26T23:30:00", "2026-12-27T12:00:00"].map(at), [null, "jul", "jul", "jul", null]);
  // Ordinary days, the rest of the year.
  for (const day of ["2026-11-16T19:00:00", "2026-01-01T12:00:00", "2026-02-14T20:00:00", "2026-05-17T20:00:00", "2026-07-23T12:00:00", "2026-09-15T20:00:00", "2026-12-31T23:00:00"]) assert.equal(at(day), null, day);
});

test("a year of the horse's days: forty of them, whatever the year, and no day claimed twice", () => {
  // Five days of Easter, Valborg, the National Day, two of Midsummer, twenty-five of crayfish, the bun,
  // Saint Bridget, Lucia and three of Christmas. A day that two of them claimed would leave one of them short.
  for (let year = 2024; year <= 2040; year++) {
    const worn = {};
    for (let day = new Date(year, 0, 1, 12); day.getFullYear() === year; day.setDate(day.getDate() + 1)) {
      const id = occasion(day)?.id;
      if (id) worn[id] = (worn[id] || 0) + 1;
    }
    assert.deepEqual(worn, { pask: 5, valborg: 1, nationaldag: 1, midsommar: 2, kraftskiva: 25, kanelbulle: 1, birgitta: 1, lucia: 1, jul: 3 }, String(year));
  }
});

test("the horse's day is Kuvert's: it lasts until four in the morning", () => {
  // The small hours belong to the evening before.
  assert.deepEqual(["2026-12-13T03:00:00", "2026-12-14T02:30:00", "2026-12-14T04:00:00"].map(at), [null, "lucia", null]);
  assert.deepEqual(["2026-12-24T03:59:00", "2026-12-27T02:00:00", "2026-12-27T04:30:00"].map(at), [null, "jul", null]);
  assert.deepEqual(["2026-06-19T01:00:00", "2026-06-21T01:00:00", "2026-06-21T05:00:00"].map(at), [null, "midsommar", null]);
  // Valborg's bonfire is still glowing at two, and the last crayfish party ends on the first of September.
  assert.deepEqual(["2026-04-30T03:00:00", "2026-05-01T02:00:00", "2026-05-01T04:00:00"].map(at), [null, "valborg", null]);
  assert.deepEqual(["2026-08-07T03:30:00", "2026-09-01T01:00:00", "2026-09-01T04:00:00"].map(at), [null, "kraftskiva", null]);
  assert.deepEqual(["2026-04-02T02:00:00", "2026-04-07T03:00:00", "2026-04-07T04:00:00"].map(at), [null, "pask", null]);
});
