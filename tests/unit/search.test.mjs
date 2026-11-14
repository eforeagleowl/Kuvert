// The Library's search also finds films by what they are about, once the premise lines are in
// (js/state/catalog.js learnPremises).
import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryStorage } from "./helpers.mjs";
import { resolveList } from "../../js/data/lists.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { PREMISES } from "../../js/data/premises-en.js";

const fresh = () => makeCatalog(resolveList(new MemoryStorage()));
const found = (catalog, q) => catalog.films.filter((f) => catalog.matchesSearch(f, q)).map((f) => f.id);

test("before the premise lines are in, the search is by title, year and nickname only", () => {
  const catalog = fresh();
  assert.deepEqual(found(catalog, "boxer"), []);
  assert.ok(found(catalog, "rocky").includes("1976-rocky"));
  assert.equal(catalog.premise("1976-rocky"), null);
});

test("with them, a word for what a film is about finds it, and the title search is unchanged", () => {
  const catalog = fresh();
  assert.equal(catalog.learnPremises(PREMISES), true);
  const boxer = found(catalog, "boxer");
  assert.ok(boxer.includes("1976-rocky") && boxer.includes("1980-raging-bull") && boxer.includes("1954-on-the-waterfront"), boxer.join());
  // Title matches are still told apart, so the Library can list them first.
  const rocky = catalog.byId.get("1976-rocky");
  assert.equal(catalog.matchesTitle(rocky, "boxer"), false);
  assert.equal(catalog.matchesTitle(rocky, "rocky"), true);
  assert.match(catalog.premise("1976-rocky"), /Philadelphia boxer/);
  // Several words: each starts a word of the premise, the title or the year.
  assert.deepEqual(found(catalog, "nightclub casablanca"), ["1942-casablanca"]);
  assert.ok(found(catalog, "shark").includes("1975-jaws"));
  assert.ok(found(catalog, "shark 1975").includes("1975-jaws"));
  assert.deepEqual(found(catalog, "shark 1976"), ["1976-rocky"], "Rocky collects debts for a loan shark");
  assert.deepEqual(found(catalog, "shark 1977"), []);
  // Accents and case don't matter.
  assert.ok(found(catalog, "KRAKÓW").includes("1993-schindler-s-list"));
});

test("short words narrow by title only: the first letters you type don't bring in half the list", () => {
  const catalog = fresh();
  catalog.learnPremises(PREMISES);
  const titles = (q) => catalog.films.filter((f) => catalog.matchesTitle(f, q)).length;
  for (const q of ["a", "th", "the", "in", "lov"]) assert.equal(found(catalog, q).length, titles(q), q);
  assert.ok(found(catalog, "love").length > titles("love"), "four letters: what films are about joins in");
  // Small words ride along with a real one.
  assert.ok(found(catalog, "the boxer").includes("1976-rocky"));
});

test("a list's own films that Kuvert has no line for are found by title as before", () => {
  const catalog = fresh();
  assert.equal(catalog.learnPremises({}), false);
  assert.equal(catalog.learnPremises(null), false);
  assert.ok(found(catalog, "godfather").length >= 3);
});
