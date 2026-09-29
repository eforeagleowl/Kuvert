// Every English string Kuvert looks up in its Swedish dictionary (js/i18n/sv.js): the page's own text
// and labels (index.html, outside anything marked lang="sv"), and the string literals the code passes
// to t() and sg(). tests/unit/i18n.test.mjs checks each has a translation.
//   node tools/i18n-keys.mjs   lists the ones still missing
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const ATTRS = ["aria-label", "title", "placeholder", "alt"];
const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
const norm = (s) => decode(s).replace(/\s+/g, " ").trim();

/** The page's text and labels, as translatePage() sees them. */
export function pageKeys(html = readFileSync(join(ROOT, "index.html"), "utf8")) {
  const body = html.slice(html.indexOf("<body"));
  const keys = new Set();
  const stack = []; // [tag, skip]
  const skipping = () => stack.some(([, skip]) => skip);
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)([^>]*)>|([^<]+)/g;
  for (let m; (m = re.exec(body)); ) {
    if (m[0].startsWith("<!--")) continue;
    if (m[4] !== undefined) {
      const text = norm(m[4]);
      if (text && /[A-Za-z]/.test(text) && !skipping()) keys.add(text);
      continue;
    }
    const [, close, tag, rest] = m;
    const name = tag.toLowerCase();
    if (close) {
      const i = stack.map(([t]) => t).lastIndexOf(name);
      if (i >= 0) stack.length = i;
      continue;
    }
    const skip = /\blang="sv"/.test(rest) || /\bclass="(?:[^"]* )?en(?: [^"]*)?"/.test(rest) || name === "script" || name === "style";
    if (!skip && !skipping()) for (const a of ATTRS) for (const am of rest.matchAll(new RegExp("\\s" + a + '="([^"]*)"', "g"))) if (/[A-Za-z]/.test(am[1])) keys.add(norm(am[1]));
    if (!VOID.has(name) && !rest.trim().endsWith("/")) stack.push([name, skip]);
    if (name === "svg" && !skip) {
      // Icons and drawings: nothing to read inside them.
      const end = body.indexOf("</svg>", re.lastIndex);
      re.lastIndex = end < 0 ? body.length : end;
    }
  }
  return keys;
}

// A JS string literal starting at i: [value, index after it], or null.
function literal(src, i) {
  const q = src[i];
  if (q !== '"' && q !== "'" && q !== "`") return null;
  let out = "";
  for (let j = i + 1; j < src.length; j++) {
    const c = src[j];
    if (c === "\\") {
      out += src[++j];
      continue;
    }
    if (c === q) return [q === "`" && out.includes("${") ? null : out, j + 1];
    out += c;
  }
  return null;
}
// The string literals in a call's first argument (both branches of a ternary count).
function firstArgStrings(src, start) {
  const found = [];
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    const lit = literal(src, i);
    if (lit) {
      // Not the values it's compared against (r === "file"), nor SEAGAL's font specs.
      const compared = /[=!]==?\s*$/.test(src.slice(Math.max(0, i - 5), i));
      if (depth === 0 && lit[0] !== null && !compared && !/^\d+ \d+px/.test(lit[0])) found.push(lit[0]);
      i = lit[1] - 1;
      continue;
    }
    if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) {
      if (depth === 0) break;
      depth--;
    } else if (c === "," && depth === 0) break;
  }
  return found;
}
function jsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? jsFiles(join(dir, e.name)) : e.name.endsWith(".js") ? [join(dir, e.name)] : []));
}
/** Strings the code hands to t() and sg(). SEAGAL's own words (sg's second argument) stay English. */
export function codeKeys() {
  const keys = new Set();
  for (const file of jsFiles(join(ROOT, "js"))) {
    if (file.includes(join("js", "i18n"))) continue;
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/(?<![\w.$])t\(|\bsg\(/g)) for (const s of firstArgStrings(src, m.index + m[0].length)) if (/[A-Za-z]/.test(s)) keys.add(s);
  }
  return keys;
}

/** Strings looked up through a variable: the list's shelves, moods, paint and palettes, words kept in
 * tables, TMDB's genres, and the save formats' error messages (shown with t(e.message)). */
export async function indirectKeys() {
  const { KUVERT, MOODS, PALETTES } = await import("../js/data/catalogue.js");
  const { PAINT_NAMES, ratingWord, tallyNote } = await import("../js/state/stats.js");
  const keys = new Set([...MOODS, ...PAINT_NAMES, ...Object.values(PALETTES).map((p) => p.label)]);
  for (const s of Object.values(KUVERT.shelves)) keys.add(s.chip).add(s.label).add(s.plural);
  for (const r of [1, 2, 3, 4, 4.5, 5]) keys.add(" " + ratingWord(r)[1]);
  for (const n of [0, 1, 30, 60, 90, 100]) keys.add(tallyNote(n, 100)[1]);
  for (const w of ["Yes", "Unsure", "No", "Won", "Nominated", "Honorable mention", "Tonight's film.", "Date", "Time", "Year", "Track", "Remarks", "Stars", KUVERT.subtitle]) keys.add(w);
  // TMDB's movie genres, which it names in English.
  for (const g of ["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery", "Romance", "Science Fiction", "TV Movie", "Thriller", "War", "Western"]) keys.add(g);
  for (const dir of ["compat", "data", "storage"])
    for (const file of jsFiles(join(ROOT, "js", dir))) for (const m of readFileSync(file, "utf8").matchAll(/Error\("([^"]+)"\)/g)) keys.add(m[1]);
  return keys;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { SV } = await import("../js/i18n/sv.js");
  const { UNTRANSLATED } = await import("../tests/unit/i18n-neutral.mjs");
  const missing = [...pageKeys(), ...codeKeys(), ...(await indirectKeys())].filter((k) => !Object.hasOwn(SV, k) && !UNTRANSLATED.has(k));
  console.log([...new Set(missing)].join("\n") || "Every string has a Swedish translation.");
}
