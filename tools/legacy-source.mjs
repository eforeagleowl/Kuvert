// Reads the constants that define the catalogue out of the original single-file app (/index.html),
// without running the app. Used to generate next/js/data and next/js/compat/legacy-ids.js, and by the
// drift test that keeps both apps on the same catalogue while they live side by side.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const NAMES = [
  "FILMS",
  "LEGACY_IDS",
  "LOCAL_LEGACY_IDS",
  "KUVERT_CONFIG",
  "PALETTES",
  "MOODS",
  "SEAGAL_FILMS",
  "BEST_PICTURE_FIELD",
  "SEAGAL_LIST_VERSION",
];

// Finds `const NAME = <expression>;` and returns the expression text, balancing brackets and skipping strings.
function declaration(src, name) {
  const at = src.search(new RegExp("\\bconst " + name + "\\s*="));
  if (at < 0) throw Error("Missing const " + name + " in the original app.");
  let i = src.indexOf("=", at) + 1,
    depth = 0,
    quote = null;
  const start = i;
  for (; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === "\\") i++;
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "/" && src[i + 1] === "/") i = src.indexOf("\n", i);
    else if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) depth--;
    else if ((c === ";" || c === ",") && depth === 0) break;
    else if (c === "\n" && depth === 0 && src.slice(start, i).trim()) break;
  }
  return src.slice(start, i).trim();
}

export function readLegacy(path = new URL("../index.html", import.meta.url)) {
  const src = readFileSync(path, "utf8");
  const code = NAMES.map((n) => "out." + n + " = (" + declaration(src, n) + ");").join("\n");
  const out = {};
  vm.runInNewContext(code, { out });
  // Structured clone detaches the values from the sandbox's prototypes.
  return JSON.parse(JSON.stringify(out));
}
