// Writes the catalogue modules for the rebuild from the original app:
//   js/data/catalogue.js      films, list config, palettes, moods, Oscar field sizes, the SEAGAL list
//   js/compat/legacy-ids.js   the frozen film orders that old bit-packed codes decode against
// Run: node tools/extract-legacy.mjs   (tests/drift.test.mjs fails if these fall out of step)
import { writeFileSync } from "node:fs";
import { readLegacy } from "./legacy-source.mjs";

const L = readLegacy();
const json = (v) => JSON.stringify(v);
const lines = (arr) => "[\n" + arr.map((x) => "  " + json(x) + ",").join("\n") + "\n]";
const head = "// Generated from classic/index.html by tools/extract-legacy.mjs. Do not edit by hand.\n";

writeFileSync(
  new URL("../js/data/catalogue.js", import.meta.url),
  head +
    "// Each film keeps a permanent id; `tri`/`ord` mark parts of a series; `c` is the Academy Awards\n" +
    "// ceremony (1st–98th) where a winner or nominee competed for Best Picture.\n\n" +
    "export const KUVERT = " + JSON.stringify(L.KUVERT_CONFIG, null, 2) + ";\n\n" +
    "export const FILMS = " + lines(L.FILMS) + ";\n\n" +
    "// Named palettes. The dala horse silhouette stays the same in every one.\n" +
    "export const PALETTES = " + JSON.stringify(L.PALETTES, null, 2) + ";\n\n" +
    "export const MOODS = " + json(L.MOODS) + ";\n\n" +
    "// Best Picture nominees per ceremony (1st–98th), winner included.\n" +
    "export const BEST_PICTURE_FIELD = " + json(L.BEST_PICTURE_FIELD) + ";\n\n" +
    "// SEAGAL mode's list: [title, year, part of Under Siege, kind].\n" +
    "export const SEAGAL_FILMS = " + lines(L.SEAGAL_FILMS) + ";\n" +
    "export const SEAGAL_LIST_VERSION = " + L.SEAGAL_LIST_VERSION + ";\n",
);

writeFileSync(
  new URL("../js/compat/legacy-ids.js", import.meta.url),
  head +
    "// Frozen catalogue orderings used to decode old bit-packed progress codes. Never edit.\n" +
    "// ORIGINAL: the list before five films were added. LOCAL: the updated list (the default choice).\n" +
    "export const LEGACY_IDS = Object.freeze(" + json(L.LEGACY_IDS) + ");\n" +
    "export const LOCAL_LEGACY_IDS = Object.freeze(" + json(L.LOCAL_LEGACY_IDS) + ");\n",
);
console.log("Wrote catalogue.js (" + L.FILMS.length + " films) and legacy-ids.js");
