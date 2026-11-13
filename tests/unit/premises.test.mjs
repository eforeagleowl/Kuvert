// The premise lines: what each film is about, in one line, in English and in Swedish
// (js/data/premises-en.js, premises-sv.js; shown on the ticket by js/views/stage.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { FILM_TABLE } from "../../js/data/films.js";
import { PREMISES as EN } from "../../js/data/premises-en.js";
import { PREMISES as SV } from "../../js/data/premises-sv.js";
import { premises } from "../../js/i18n/premises.js";
import { validateCatalogue } from "../../tools/catalogue-check.mjs";

const ids = Object.keys(FILM_TABLE);

test("every film has its line in both languages, in the table's order, and no line is left over", () => {
  assert.deepEqual(Object.keys(EN), ids);
  assert.deepEqual(Object.keys(SV), ids);
  assert.equal(ids.length, 684);
});

test("a line is short, whole and plainly set: nothing cut off, no quotation marks to straighten, no dashes", () => {
  for (const [lang, lines] of [["en", EN], ["sv", SV]])
    for (const id of ids) {
      const line = lines[id],
        where = lang + " " + id + ": " + line;
      assert.ok(line.length >= 40 && line.length <= 160, where);
      assert.match(line, /^[\p{Lu}\p{N}]/u, where);
      assert.match(line, /[\p{L}\p{N})]\.$/u, where);
      assert.doesNotMatch(line, /["“”„«»]|\s[-–—]\s|—|\.\.\.|…|\s{2}|\n/, where);
      // An initial's full stop (J. M. Barrie, George S. Patton) ends no sentence.
      assert.ok(line.split(/(?<!\b\p{Lu})[.!?] /u).length <= 2, "one or two sentences: " + where);
    }
  // The two languages say the same thing in their own words.
  for (const id of ids) assert.notEqual(EN[id], SV[id], id);
  assert.match(EN["1942-casablanca"], /^In wartime Casablanca, a cynical nightclub owner/);
  assert.match(SV["1942-casablanca"], /^I krigets Casablanca ser en cynisk nattklubbsägare/);
  assert.match(SV["1957-wild-strawberries"], /Lund/);
});

test("a line gives the film's title no more room than it needs, and never the word for its ending", () => {
  // Not a proof against spoilers (docs/EDITORIAL.md has the rule a person follows), but the obvious tells.
  for (const id of ids) {
    assert.doesNotMatch(EN[id], /\b(in the end|finally|at last|turns out|twist|dies at|is killed by|the killer is|ending)\b/i, id);
    assert.doesNotMatch(SV[id], /\b(till slut|slutligen|visar det sig|mördaren är|i slutet)\b/i, id);
  }
});

test("the lines are fetched once, in the page's language", async () => {
  const lines = await premises();
  assert.equal(lines, EN, "English unless the page chose Swedish (tests/unit/titles-sv.test.mjs has the Swedish side)");
  assert.equal(await premises(), lines);
});

test("validation catches a film without a line, a line for no film, and a line that is the same in both languages", () => {
  const { ["1942-casablanca"]: _gone, ...missing } = EN;
  assert.ok(validateCatalogue({ premises: { en: missing, sv: SV } }).errors.some((e) => e.includes("Premises (en): 1942-casablanca needs one line")));
  assert.ok(validateCatalogue({ premises: { en: { ...EN, "1999-no-such-film": "A line about a film that Kuvert does not have at all." }, sv: SV } }).errors.some((e) => e.includes("Premises (en): 1999-no-such-film is not in the film table")));
  assert.ok(validateCatalogue({ premises: { en: EN, sv: { ...SV, "1942-casablanca": EN["1942-casablanca"] } } }).errors.some((e) => e.includes("Premises: 1942-casablanca reads the same in both languages")));
  assert.ok(validateCatalogue({ premises: { en: { ...EN, "1942-casablanca": "Too short." }, sv: SV } }).errors.some((e) => e.includes("Premises (en): 1942-casablanca")));
});
