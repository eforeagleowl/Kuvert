// While both apps live on the site, they must agree on the catalogue. If the original's list changes,
// run `npm run extract` and `npm run golden`, then commit what they write.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readLegacy } from "../../tools/legacy-source.mjs";
import * as cat from "../../js/data/catalogue.js";
import { LEGACY_IDS, LOCAL_LEGACY_IDS } from "../../js/compat/legacy-ids.js";

const L = readLegacy();

test("films are the same as the original app's", () => assert.deepEqual(cat.FILMS, L.FILMS));
test("list config is the same", () => assert.deepEqual(cat.KUVERT, L.KUVERT_CONFIG));
test("palettes, moods and Oscar fields are the same", () => {
  assert.deepEqual(cat.PALETTES, L.PALETTES);
  assert.deepEqual(cat.MOODS, L.MOODS);
  assert.deepEqual(cat.BEST_PICTURE_FIELD, L.BEST_PICTURE_FIELD);
});
test("the SEAGAL list is the same", () => {
  assert.deepEqual(cat.SEAGAL_FILMS, L.SEAGAL_FILMS);
  assert.equal(cat.SEAGAL_LIST_VERSION, L.SEAGAL_LIST_VERSION);
});
test("frozen legacy orders never change", () => {
  assert.deepEqual([...LEGACY_IDS], L.LEGACY_IDS);
  assert.deepEqual([...LOCAL_LEGACY_IDS], L.LOCAL_LEGACY_IDS);
});
