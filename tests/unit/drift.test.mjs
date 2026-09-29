// Old progress codes are bit-packed against the film order Kuvert Classic shipped. Those orders are
// frozen: they must stay exactly as Classic had them, whatever happens to the list itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readLegacy } from "../../tools/legacy-source.mjs";
import { LEGACY_IDS, LOCAL_LEGACY_IDS } from "../../js/compat/legacy-ids.js";

const L = readLegacy();

test("frozen legacy orders never change", () => {
  assert.deepEqual([...LEGACY_IDS], L.LEGACY_IDS);
  assert.deepEqual([...LOCAL_LEGACY_IDS], L.LOCAL_LEGACY_IDS);
});
