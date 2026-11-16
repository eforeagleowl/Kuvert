// Stats as paper and film (js/state/stats.js): the klippkort that counts the weekly streak, the strip of
// film each decade gets, and the small drawing in a milestone's stamp.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { punchCard, weekStreak, decadeStrips, computeMilestones, CLIPS, FRAMES_MAX } from "../../js/state/stats.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { resolveList } from "../../js/data/lists.js";
import { MemoryStorage } from "./helpers.mjs";

const catalog = makeCatalog(resolveList(new MemoryStorage()));
// A Wednesday evening. Its week runs from Monday the 16th to Sunday the 22nd.
const NOW = new Date("2026-11-18T20:00:00");
const iso = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
/** One film on the Tuesday of each of these weeks: 0 is this week, 1 last week, and so on. */
function watchedIn(...weeksBack) {
  const p = { seen: new Set(), dates: {} };
  weeksBack.forEach((back, i) => {
    const day = new Date("2026-11-17T12:00:00");
    day.setDate(day.getDate() - back * 7);
    p.seen.add(catalog.films[i].id);
    p.dates[catalog.films[i].id] = iso(day);
  });
  return p;
}
const weeks = (n, from = 0) => Array.from({ length: n }, (_, i) => from + i);

test("the klippkort: a hole for each week in a row, ten to a card", () => {
  assert.equal(CLIPS, 10);
  // Nothing yet: card one, no holes, and this week's is the first to punch.
  assert.deepEqual(punchCard(watchedIn(), catalog, NOW), { streak: 0, card: 1, cut: 0, open: true });
  assert.deepEqual(punchCard(watchedIn(0), catalog, NOW), { streak: 1, card: 1, cut: 1, open: false });
  // Three weeks up to last week: this week is still open, and an open week doesn't break the streak.
  assert.deepEqual(punchCard(watchedIn(...weeks(3, 1)), catalog, NOW), { streak: 3, card: 1, cut: 3, open: true });
  // A missed week does: only what came after it counts.
  assert.deepEqual(punchCard(watchedIn(0, 2, 3, 4), catalog, NOW), { streak: 1, card: 1, cut: 1, open: false });
  assert.deepEqual(punchCard(watchedIn(2, 3, 4), catalog, NOW), { streak: 0, card: 1, cut: 0, open: true });
  // The tenth week fills the card; the eleventh starts the next one.
  assert.deepEqual(punchCard(watchedIn(...weeks(10)), catalog, NOW), { streak: 10, card: 1, cut: 10, open: false });
  assert.deepEqual(punchCard(watchedIn(...weeks(11)), catalog, NOW), { streak: 11, card: 2, cut: 1, open: false });
  assert.deepEqual(punchCard(watchedIn(...weeks(25)), catalog, NOW), { streak: 25, card: 3, cut: 5, open: false });
  assert.deepEqual(punchCard(watchedIn(...weeks(20, 1)), catalog, NOW), { streak: 20, card: 2, cut: 10, open: true });
  // The ticket's punched holes count the same weeks.
  for (const p of [watchedIn(), watchedIn(0), watchedIn(...weeks(3, 1)), watchedIn(...weeks(25))]) assert.equal(weekStreak(p, catalog, NOW), punchCard(p, catalog, NOW).streak);
  // A film with no date punches nothing.
  const undated = watchedIn(0);
  undated.dates = {};
  assert.equal(punchCard(undated, catalog, NOW).streak, 0);
});

test("a strip of film for each decade: a frame per film, exposed once it is watched", () => {
  const seen = new Set(catalog.films.filter((_, i) => i % 4 === 0).map((f) => f.id));
  const { per, longest, strips } = decadeStrips({ seen }, catalog);
  // Kuvert's own list fits a frame per film.
  assert.equal(per, 1);
  assert.deepEqual(strips.map((s) => s.decade), catalog.decades);
  assert.equal(strips.reduce((n, s) => n + s.frames.length, 0), catalog.films.length);
  assert.equal(longest, Math.max(...strips.map((s) => s.frames.length)));
  assert.ok(longest <= FRAMES_MAX);
  for (const s of strips) {
    // Each frame is one film of that decade, oldest first, lit if it is watched.
    assert.ok(s.frames.every((fr) => fr.films.length === 1 && Math.floor(fr.films[0].y / 10) * 10 === s.decade));
    assert.deepEqual(s.frames.map((fr) => fr.films[0].y), s.frames.map((fr) => fr.films[0].y).sort((a, b) => a - b));
    assert.deepEqual(s.frames.map((fr) => fr.lit), s.frames.map((fr) => (seen.has(fr.films[0].id) ? 1 : 0)));
  }
  assert.equal(strips.flatMap((s) => s.frames).filter((fr) => fr.lit).length, seen.size);
});

test("a decade too long for its strip shares its frames: lit when all its films are watched, half lit when some are", () => {
  const all = decadeStrips({ seen: new Set() }, catalog),
    most = all.longest;
  // Room for ten frames: the longest decade decides how many films go to a frame.
  const per = Math.ceil(most / 10);
  const none = decadeStrips({ seen: new Set() }, catalog, 10);
  assert.equal(none.per, per);
  assert.equal(none.longest, Math.ceil(most / per));
  assert.ok(none.strips.every((s, i) => s.frames.length === Math.ceil(all.strips[i].frames.length / per)));
  assert.ok(none.strips.flatMap((s) => s.frames).every((fr) => fr.lit === 0 && fr.films.length >= 1 && fr.films.length <= per));
  // Every film is in exactly one frame.
  assert.equal(none.strips.flatMap((s) => s.frames).reduce((n, fr) => n + fr.films.length, 0), catalog.films.length);
  // One film of a frame watched: half lit. All of them: lit.
  const frame = none.strips.find((s) => s.frames[0].films.length > 1).frames[0];
  const lit = (ids) => decadeStrips({ seen: new Set(ids) }, catalog, 10).strips.flatMap((s) => s.frames).find((fr) => fr.films[0].id === frame.films[0].id).lit;
  assert.equal(lit([frame.films[0].id]), 0.5);
  assert.equal(lit(frame.films.map((f) => f.id)), 1);
  // A list with no films has no strips to draw.
  assert.deepEqual(decadeStrips({ seen: new Set() }, { decades: [], films: [] }), { per: 1, longest: 0, strips: [] });
});

test("a milestone's stamp holds its drawing, or the number it counts to", () => {
  const cards = computeMilestones({ seen: new Set() }, catalog);
  const art = Object.fromEntries(cards.map((c) => [c.id.replace(/^series-.*/, "series"), c.art]));
  assert.deepEqual(art, { "watched-1": "ticket", "watched-25": null, "watched-50": null, "watched-100": null, "watched-all": "envelope", decades: "hourglass", winners: "trophy", mentions: "rosette", series: "clapper" });
  // The counting stamps keep their numbers; every stamp still has its letters or numbers, which SEAGAL shows.
  assert.deepEqual(cards.filter((c) => !c.art).map((c) => c.stamp), ["25", "50", "100"]);
  assert.ok(cards.every((c) => c.stamp));
  // Every drawing a milestone or an empty list asks for is drawn (index.html).
  const page = readFileSync(new URL("../../index.html", import.meta.url), "utf8"),
    drawn = new Set([...page.matchAll(/<symbol id="d-([a-z]+)" viewBox="0 0 48 48">/g)].map((m) => m[1]));
  const asked = new Set(cards.map((c) => c.art).filter(Boolean));
  for (const file of ["js/views/library.js", "js/views/stats.js"]) {
    const code = readFileSync(new URL("../../" + file, import.meta.url), "utf8");
    for (const m of code.matchAll(/emptyState\(\s*"([a-z]+)"/g)) asked.add(m[1]);
    for (const m of code.matchAll(/\{ skipped: "([a-z]+)", recent: "([a-z]+)", shelf: "([a-z]+)" \}\[st\.filter\] \|\| "([a-z]+)"/g)) m.slice(1).forEach((name) => asked.add(name));
  }
  assert.deepEqual([...asked].sort(), [...drawn].sort(), "every drawing in the page is used, and every drawing used is in the page");
  assert.equal(drawn.size, 12);
});
