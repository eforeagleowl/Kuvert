// The visual identity's small machines: the light a poster gives (js/ui/light.js), a film's engraving
// (js/ui/engraving.js) and the marks an envelope collects (js/state/stats.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { pickColours, asLight } from "../../js/ui/light.js";
import { engraving, seedOf } from "../../js/ui/engraving.js";
import { envelopeMarks } from "../../js/state/stats.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { resolveList } from "../../js/data/lists.js";
import { MemoryStorage } from "./helpers.mjs";

const pixels = (...runs) => new Uint8ClampedArray(runs.flatMap(([n, r, g, b, a = 255]) => Array.from({ length: n }, () => [r, g, b, a]).flat()));
const hue = ([r, g, b]) => (r > g && r > b ? "red" : g > b ? "green" : "blue");
const luminance = (c) => {
  const [r, g, b] = c.map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

test("a poster's light: its two strongest colours, whatever its borders are", () => {
  // Mostly red, a good deal of blue, with black bars and a white frame that say nothing.
  const [a, b] = pickColours(pixels([300, 0, 0, 0], [200, 255, 255, 255], [400, 210, 30, 40], [250, 30, 60, 200]));
  assert.deepEqual([hue(a), hue(b)], ["red", "blue"]);
  // One colour only: the second light is the same colour, paler.
  const [c, d] = pickColours(pixels([500, 20, 150, 60], [200, 10, 10, 10]));
  assert.deepEqual([hue(c), hue(d)], ["green", "green"]);
  assert.ok(luminance(d) > luminance(c));
  // A speck of another colour is not a second light.
  assert.equal(hue(pickColours(pixels([900, 200, 40, 40], [3, 20, 40, 220]))[1]), "red");
  // Black and white gives silver; nothing to see gives nothing.
  const silver = pickColours(pixels([400, 40, 40, 40], [400, 200, 200, 200], [200, 120, 120, 120]));
  assert.ok(silver.every(([r, g, b]) => Math.max(r, g, b) - Math.min(r, g, b) < 50), JSON.stringify(silver));
  assert.equal(pickColours(pixels([100, 0, 0, 0, 0])), null);
  assert.equal(pickColours(new Uint8ClampedArray(0)), null);
});

test("a light is as bright as its colour goes and no brighter than the page can take", () => {
  // A dark navy poster still glows…
  const navy = asLight([10, 16, 60]);
  assert.ok(Math.max(...navy) >= 200, String(navy));
  assert.equal(hue(navy), "blue");
  // …and a yellow one is held back, so the words around the ticket stay readable.
  for (const bright of [[255, 230, 0], [250, 250, 250], [120, 255, 120]]) assert.ok(luminance(asLight(bright)) <= 0.25, bright + " → " + asLight(bright));
  assert.ok(asLight([255, 230, 0])[0] > asLight([255, 230, 0])[2], "still yellow");
});

test("every film has an engraving of its own, the same each time", () => {
  const rocky = engraving("1976-rocky");
  assert.deepEqual(engraving("1976-rocky"), rocky, "the same film, the same engraving");
  assert.notDeepEqual(engraving("1942-casablanca").band, rocky.band);
  assert.notDeepEqual(engraving("1942-casablanca").rosette, rocky.rosette);
  assert.notEqual(seedOf("1976-rocky"), seedOf("1976-rocky-ii"));
  // What comes out is path data the page can draw: the band inside its 600 × 12 box, the rosette inside 200 × 200.
  for (const id of ["1976-rocky", "1942-casablanca", "2023-barbie", "1927-wings", "x"]) {
    const e = engraving(id);
    assert.equal(e.band.length, e.lines);
    assert.equal(e.rosette.length, e.rings);
    for (const d of [...e.band, ...e.rosette]) assert.match(d, /^M[-\d. ]+(L[-\d. ]+)+Z?$/);
    const ys = e.band.flatMap((d) => [...d.matchAll(/[ML]\d+ ([-\d.]+)/g)].map((m) => Number(m[1])));
    assert.ok(Math.min(...ys) >= 0 && Math.max(...ys) <= 12, id + " band " + Math.min(...ys) + "–" + Math.max(...ys));
    const points = e.rosette.flatMap((d) => [...d.matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)].flatMap((m) => [Number(m[1]), Number(m[2])]));
    assert.ok(Math.min(...points) >= 0 && Math.max(...points) <= 200, id + " rosette " + Math.min(...points) + "–" + Math.max(...points));
    assert.ok(e.rosette.every((d) => d.endsWith("Z")), "each ring closes");
  }
  // Across the whole table no two films share one.
  const seen = new Set();
  for (let i = 0; i < 700; i++) seen.add(engraving("film-" + i).rosette[0] + engraving("film-" + i).band[0]);
  assert.equal(seen.size, 700);
});

test("the envelope collects a mark for each milestone earned, and none before", () => {
  const catalog = makeCatalog(resolveList(new MemoryStorage()));
  const p = (films) => ({ seen: new Set(films.map((f) => f.id)) });
  const kinds = (films) => envelopeMarks(p(films), catalog).map((m) => m.kind);
  const others = catalog.films.filter((f) => !catalog.isWinner(f)),
    winners = catalog.films.filter(catalog.isWinner);
  assert.deepEqual(kinds([]), []);
  assert.deepEqual(kinds(others.slice(0, 1)), ["waves"]);
  assert.deepEqual(kinds(others.slice(0, 24)), ["waves"]);
  assert.deepEqual(kinds(others.slice(0, 25)), ["waves", "rek"]);
  assert.deepEqual(kinds(others.slice(0, 50)), ["waves", "rek", "flyg"]);
  assert.deepEqual(kinds(others.slice(0, 100)), ["waves", "rek", "flyg", "express"]);
  assert.deepEqual(kinds(winners.slice(0, 10)), ["waves", "crown"]);
  const all = envelopeMarks(p([...others.slice(0, 100), ...winners.slice(0, 10)]), catalog);
  assert.deepEqual(all.map((m) => m.kind), ["waves", "rek", "flyg", "express", "crown"]);
  // Each says which milestone it is for, and carries its number.
  assert.deepEqual(all.map((m) => [m.title, m.n]), [["The first ticket", 1], ["25 films watched", 25], ["50 films watched", 50], ["100 films watched", 100], ["Winner’s circle", 10]]);
});
