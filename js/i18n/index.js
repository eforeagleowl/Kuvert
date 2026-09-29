// Kuvert in Swedish. The page and the code are written in English, and in Swedish mode every string is
// looked up in sv.js, keyed by its English. Strings with values in them are templates:
// t("{n} of {total} watched", { n, total }). The page's own text is translated once, at start-up
// (translatePage). The language is chosen in Settings and remembered on this device; SEAGAL only
// speaks English.
import { SV, NOUNS } from "./sv.js";

function readLang() {
  try {
    if (globalThis.document?.documentElement.dataset.mode === "seagal") return "en";
    return globalThis.localStorage?.getItem("kuvert:lang") === "sv" ? "sv" : "en";
  } catch {
    return "en";
  }
}
export const LANG = readLang();
export const swedish = LANG === "sv";
export const LOCALE = swedish ? "sv-SE" : "en-GB";

/** The string in the current language, with {name} filled in from `vars`. */
export function t(en, vars) {
  let s = swedish && Object.hasOwn(SV, en) ? SV[en] : en;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (Object.hasOwn(vars, k) ? String(vars[k]) : m));
  return s;
}
/** "3 films" or "3 filmer". Swedish forms come from NOUNS, keyed by the English singular. */
export function plural(n, one, many = one + "s") {
  const sv = swedish && NOUNS[one];
  return n + " " + (sv ? (n === 1 ? sv[0] : sv[1]) : n === 1 ? one : many);
}
/** 1st, 2nd, 49th; or 1:a, 2:a, 49:e. */
export function ordinal(n) {
  if (swedish) return n + ((n % 10 === 1 || n % 10 === 2) && n % 100 !== 11 && n % 100 !== 12 ? ":a" : ":e");
  const s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
/** A decimal as people write it here: 4.5 or 4,5. */
export const decimal = (x, digits = 1) => (Number.isInteger(x) ? String(x) : x.toFixed(digits).replace(".", swedish ? "," : "."));
/** "A, B and C" or "A, B och C". */
export function listOf(items) {
  if (items.length < 2) return items[0] || "";
  return items.slice(0, -1).join(", ") + (swedish ? " och " : " and ") + items.at(-1);
}

const ATTRS = ["aria-label", "title", "placeholder", "alt"];
/** Translates the page's own text: its text nodes and the labels people read. Swedish mode only. */
export function translatePage(root = document.body) {
  if (!swedish) return;
  document.documentElement.lang = "sv";
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    // Scripts, styles, anything already in Swedish (lang="sv") and English echoes (.en, hidden) are left.
    acceptNode: (n) => (n.nodeType === 1 && (n.matches("script, style, .en") || n.lang === "sv") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  for (let n = walker.currentNode; n; n = walker.nextNode()) {
    if (n.nodeType === 3) {
      const key = n.nodeValue.replace(/\s+/g, " ").trim();
      if (key && Object.hasOwn(SV, key)) n.nodeValue = n.nodeValue.replace(/^(\s*)[\s\S]*?(\s*)$/, (m, a, b) => (SV[key] ? a + SV[key] + b : a || b));
    } else
      for (const a of ATTRS) {
        const v = n.getAttribute(a);
        if (v && Object.hasOwn(SV, v)) SV[v] ? n.setAttribute(a, SV[v]) : n.removeAttribute(a);
      }
  }
}
