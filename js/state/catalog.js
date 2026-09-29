// Everything derived from the list itself: lookups, shelves, ticket numbers, search and the Oscar line.
// Counts on every page come from here, never from a fixed number.
import { BEST_PICTURE_FIELD } from "../data/catalogue.js";
import { listContext } from "../compat/validate.js";

export const byYear = (a, b) => a.y - b.y || (a.ord || 0) - (b.ord || 0) || a.t.localeCompare(b.t);
export const decadeOf = (f) => Math.floor(f.y / 10) * 10;

// ---------------------------------------------------------------- forgiving search
//   "et" → E.T.   "lotr" → Lord of the Rings   "godfather 2" → Part II   "zola 1937"
const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 };
export function searchWords(s) {
  return String(s)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .split(/[\s\-–—:,/()!?]+/)
    .map((w) => w.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .map((w) => (ROMAN[w] && w !== "i" ? String(ROMAN[w]) : w));
}
function initials(words) {
  const w = words[0] === "the" ? words.slice(1) : words;
  return w.map((x) => x[0]).join("");
}

export function ordinal(n) {
  const s = ["th", "st", "nd", "rd"],
    v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
function joinTitles(titles, more) {
  const shown = titles.slice(0, 3),
    extra = titles.length - shown.length + (more || 0);
  if (!extra) return shown.length > 1 ? shown.slice(0, -1).join(", ") + " and " + shown.at(-1) : shown[0];
  return shown.join(", ") + " and " + extra + " more";
}

// TMDB's terms allow keeping its data for six months.
const POSTERS_KEEP_DAYS = 182;
/** The list's own posters while they're fresh enough to use: film id → [TMDB id, poster path]. */
export function freshPosters(posters, at, now = new Date()) {
  if (!at || !posters) return {};
  const age = (now.getTime() - new Date(at + "T00:00:00Z").getTime()) / 86400000;
  return age >= 0 && age <= POSTERS_KEEP_DAYS ? posters : {};
}

/**
 * @param {ReturnType<import("../data/lists.js").resolveList>} list
 * @param {{ posters?: Record<string, [number, string]> }} [o] the built-in list's posters (js/data/posters.js)
 */
export function makeCatalog(list, { posters = {} } = {}) {
  const films = list.films;
  const byId = new Map(films.map((f) => [f.id, f]));
  const shelves = list.shelves || {};
  const hasShelves = !!list.shelves;
  const shelfOf = (f) => shelves[f?.s] || null;
  const isWinner = (f) => !!shelfOf(f)?.winner;
  const ticketOrder = new Map([...films].sort(byYear).map((f, i) => [f.id, i + 1]));
  const width = Math.max(3, String(films.length).length);

  const index = new Map(
    films.map((f) => {
      const words = searchWords(f.t);
      const extra = [String(f.y)];
      const keys = [initials(words)];
      if (f.tri) {
        const sw = searchWords(list.series[f.tri] || "");
        extra.push(...sw, String(f.ord));
        keys.push(initials(sw), initials(sw) + f.ord);
      }
      return [f.id, { words: [...words, ...extra], keys, joined: words.join("") }];
    }),
  );
  function matchesSearch(f, raw) {
    const q = searchWords(raw);
    if (!q.length) return true;
    const idx = index.get(f.id);
    if (!idx) return f.t.toLowerCase().includes(String(raw).toLowerCase());
    // Every typed word must start one of the film's words…
    if (q.every((w) => idx.words.some((x) => x.startsWith(w)))) return true;
    // …or a single word is a nickname made of initials ("lotr", "lotr2") or run-together title ("dayofthe").
    if (q.length === 1 && q[0].length >= 3) {
      if (idx.keys.some((k) => k.length >= 3 && k.startsWith(q[0]))) return true;
      if (q[0].length >= 5 && idx.joined.includes(q[0])) return true;
    }
    return false;
  }

  // Oscar night: what each film was up against, from the `c` (ceremony) field.
  const ceremonyName = list.custom ? "ceremony" : "Academy Awards";
  const fieldSize = (c) => (list.custom ? null : BEST_PICTURE_FIELD[c - 1] || null);
  const ceremonyFilms = (c) => films.filter((f) => f.c === c && (f.s === "W" || f.s === "N"));
  const ceremonyWinner = (c) => ceremonyFilms(c).find(isWinner) || null;
  // "Lost to Rocky at the 49th Academy Awards." / "Beat Taxi Driver, All the President's Men and 2 more at …"
  function oscarLine(f) {
    if (!f || !Number.isInteger(f.c) || (f.s !== "W" && f.s !== "N")) return "";
    const at = " at the " + ordinal(f.c) + " " + ceremonyName + ".";
    if (isWinner(f)) {
      const others = ceremonyFilms(f.c).filter((x) => x !== f),
        total = fieldSize(f.c),
        more = total ? Math.max(0, total - 1 - others.length) : 0;
      if (others.length) return "Beat " + joinTitles(others.map((x) => x.t), more) + at;
      return total ? "Beat " + (total - 1) + " other nominees" + at : "Won" + at;
    }
    const w = ceremonyWinner(f.c);
    return w ? "Lost to " + w.t + at : "Nominated" + at;
  }

  const decades = [...new Set(films.map(decadeOf))].sort((a, b) => a - b);
  const usedShelves = new Set(films.map((f) => f.s).filter(Boolean));

  return {
    list,
    films,
    byId,
    ids: new Set(byId.keys()),
    ctx: listContext(list),
    shelves,
    hasShelves,
    usedShelves,
    shelfOf,
    isWinner,
    series: list.series || {},
    seriesParts: (key) => films.filter((f) => f.tri === key).sort((a, b) => a.ord - b.ord),
    ticketNumber: (f) => String(ticketOrder.get(f.id)).padStart(width, "0"),
    // The list's own TMDB match and poster for a film, if it has them (the built-in list only).
    hasPosters: list.id === "builtin" && Object.keys(posters).length > 0,
    tmdbId: (id) => (list.id === "builtin" && Object.hasOwn(posters, id) ? posters[id][0] : null),
    poster: (id) => (list.id === "builtin" && Object.hasOwn(posters, id) ? posters[id][1] : null),
    matchesSearch,
    oscarLine,
    ceremonyFilms,
    ceremonyWinner,
    decades,
    inYearOrder: () => [...films].sort(byYear),
  };
}
