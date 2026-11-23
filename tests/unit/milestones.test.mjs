// An earned milestone keeps the films that earned it and the day it was earned (js/state/stats.js,
// computeMilestones), for the picture of it (js/share/images.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeMilestones } from "../../js/state/stats.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { resolveList } from "../../js/data/lists.js";
import { MemoryStorage } from "./helpers.mjs";

const catalog = makeCatalog(resolveList(new MemoryStorage()));
const day = (n) => new Date(Date.UTC(2026, 0, 1 + n)).toISOString().slice(0, 10);
/** Progress with these films watched, [film, date or null]. */
function watched(pairs) {
  const p = { seen: new Set(), dates: {} };
  for (const [film, date] of pairs) {
    p.seen.add(film.id);
    if (date) p.dates[film.id] = date;
  }
  return p;
}
const card = (p, id) => computeMilestones(p, catalog).find((c) => c.id === id);
const ids = (films) => films.map((f) => f.id);

test("a milestone not yet earned has no films and no day", () => {
  for (const c of computeMilestones(watched([]), catalog)) assert.deepEqual([c.complete, c.films, c.earned], [false, [], null], c.id);
  const some = card(watched(catalog.films.slice(0, 10).map((f, i) => [f, day(i)])), "watched-25");
  assert.deepEqual([some.n, some.complete, some.films, some.earned], [10, false, [], null]);
});

test("counting milestones are earned by the first films to reach the count, in the order you watched them", () => {
  // Thirty films, watched in the reverse of the list's order.
  const thirty = catalog.films.slice(0, 30),
    p = watched(thirty.map((f, i) => [f, day(30 - i)]));
  const first = card(p, "watched-1"),
    quarter = card(p, "watched-25");
  assert.deepEqual([ids(first.films), first.earned], [[thirty[29].id], day(1)]);
  assert.deepEqual(ids(quarter.films), ids(thirty.slice(5).reverse()), "the first twenty-five by date");
  assert.equal(quarter.earned, day(25), "the day the twenty-fifth was watched");
  // Films seen before Kuvert have no date: they count first, and a milestone they complete has no day.
  const before = watched([[thirty[0], day(5)], [thirty[1], null]]);
  assert.deepEqual([ids(card(before, "watched-1").films), card(before, "watched-1").earned], [[thirty[1].id], null]);
});

test("a series is earned on the day its last part was watched, a decade's tour on the day of its last decade", () => {
  const [key] = Object.keys(catalog.series),
    parts = catalog.films.filter((f) => f.tri === key);
  assert.ok(parts.length >= 2);
  const p = watched(parts.map((f, i) => [f, day(40 - i * 3)]));
  const series = card(p, "series-" + key);
  assert.equal(series.complete, true);
  assert.deepEqual(ids(series.films), ids([...parts].reverse()), "in the order they were watched");
  assert.equal(series.earned, day(40));
  // One film from each decade, and a second from the first decade later on: the second doesn't count.
  const decades = [...new Set(catalog.films.map((f) => Math.floor(f.y / 10)))],
    firsts = decades.map((d) => catalog.films.find((f) => Math.floor(f.y / 10) === d)),
    extra = catalog.films.find((f) => Math.floor(f.y / 10) === decades[0] && f !== firsts[0]);
  const tour = card(watched([...firsts.map((f, i) => [f, day(i * 2)]), [extra, day(90)]]), "decades");
  assert.equal(tour.complete, true);
  assert.deepEqual(ids(tour.films), ids(firsts));
  assert.equal(tour.earned, day((decades.length - 1) * 2));
  // The winners' circle: the first ten winners watched, however many more follow.
  const winners = catalog.films.filter(catalog.isWinner).slice(0, 12),
    circle = card(watched(winners.map((f, i) => [f, day(i)])), "winners");
  assert.deepEqual([ids(circle.films), circle.earned], [ids(winners.slice(0, 10)), day(9)]);
});
