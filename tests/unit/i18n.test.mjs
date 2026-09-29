// Swedish mode: every string in the page and the code has a translation that keeps its placeholders, and
// numbers, plurals, ordinals and lists read the Swedish way.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SV, NOUNS } from "../../js/i18n/sv.js";
import { pageKeys, codeKeys, indirectKeys } from "../../tools/i18n-keys.mjs";
import { UNTRANSLATED } from "./i18n-neutral.mjs";

test("every string in the page and the code has a Swedish translation", async () => {
  const keys = [...pageKeys(), ...codeKeys(), ...(await indirectKeys())];
  assert.ok(keys.length > 700, "found the strings (" + keys.length + ")");
  const missing = [...new Set(keys.filter((k) => !Object.hasOwn(SV, k) && !UNTRANSLATED.has(k)))];
  assert.deepEqual(missing, [], "run node tools/i18n-keys.mjs and add these to js/i18n/sv.js");
});

test("translations keep their placeholders", () => {
  const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const [en, sv] of Object.entries(SV)) if (sv) assert.deepEqual(vars(sv), vars(en), `"${en}" → "${sv}"`);
  for (const [en, forms] of Object.entries(NOUNS)) assert.equal(forms.length, 2, en);
});

test("in Swedish: t(), plurals, ordinals, decimals and lists", async () => {
  // A second copy of the module, loaded as if this browser had chosen Swedish.
  const before = globalThis.localStorage;
  globalThis.localStorage = { getItem: (k) => (k === "kuvert:lang" ? "sv" : null) };
  const I = await import("../../js/i18n/index.js?sv");
  globalThis.localStorage = before;
  assert.equal(I.swedish, true);
  assert.equal(I.LOCALE, "sv-SE");
  assert.equal(I.t("Tonight"), "Ikväll");
  assert.equal(I.t("{n} of {total} earned", { n: 3, total: 9 }), "3 av 9 tagna");
  assert.equal(I.t("Not a key {x}", { x: 1 }), "Not a key 1", "unknown strings stay as they are");
  assert.equal(I.plural(1, "film"), "1 film");
  assert.equal(I.plural(3, "film"), "3 filmer");
  assert.equal(I.plural(2, "week"), "2 veckor");
  assert.equal(I.plural(2, "person", "people"), "2 personer");
  assert.equal(I.plural(2, "thing"), "2 things", "a noun without Swedish forms keeps its English");
  assert.deepEqual([1, 2, 3, 11, 21, 49].map(I.ordinal), ["1:a", "2:a", "3:e", "11:e", "21:a", "49:e"]);
  assert.equal(I.decimal(4.5), "4,5");
  assert.equal(I.listOf(["A", "B", "C"]), "A, B och C");
  // And the English copy, as everyone else sees it.
  const E = await import("../../js/i18n/index.js");
  assert.equal(E.swedish, false);
  assert.equal(E.t("Tonight"), "Tonight");
  assert.equal(E.plural(3, "film"), "3 films");
  assert.equal(E.ordinal(49), "49th");
  assert.equal(E.decimal(4.5), "4.5");
  assert.equal(E.listOf(["A", "B"]), "A and B");
});
