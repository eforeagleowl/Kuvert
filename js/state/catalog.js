// Everything derived from the list itself: lookups, shelves, ticket numbers, search and the Oscar line.
// Counts on every page come from here, never from a fixed number.
import { awardFor } from "../data/awards.js";
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

import { ordinal, t, listOf } from "../i18n/index.js";
import { localTitle, localSeries } from "../i18n/titles.js";
export { ordinal };
function joinTitles(titles, more) {
  const shown = titles.slice(0, 3),
    extra = titles.length - shown.length + (more || 0);
  if (!extra) return listOf(shown);
  return t("{titles} and {n} more", { titles: shown.join(", "), n: extra });
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
 * @param {{ posters?: Record<string, [number, string]> }} [o] Kuvert's own posters (js/data/posters.js)
 */
export function makeCatalog(list, { posters = {} } = {}) {
  // In Swedish mode the catalog's own copies carry the Swedish title, the original in `orig`
  // (js/i18n/titles.js). The list's films keep theirs: exports and syncs never change language.
  const films = list.films.map((f) => {
    const sv = localTitle(f);
    return sv ? { ...f, t: sv, orig: f.t } : f;
  });
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
      // Either title finds it: "gudfadern" or "godfather".
      const extra = [String(f.y), ...(f.orig ? searchWords(f.orig) : [])];
      const keys = [initials(words), ...(f.orig ? [initials(searchWords(f.orig))] : [])];
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

  // Award night: what each film was up against, from the `c` (ceremony) field. The list's award
  // (js/data/awards.js) names the ceremony and knows how many films competed; a list without one has neither.
  const award = awardFor(list);
  const ceremonyName = t(award ? award.event : "ceremony");
  const fieldSize = (c) => award?.field?.(c) ?? null;
  const ceremonyFilms = (c) => films.filter((f) => f.c === c && (f.s === "W" || f.s === "N"));
  const ceremonyWinner = (c) => ceremonyFilms(c).find(isWinner) || null;
  // "Lost to Rocky at the 49th Academy Awards." / "Beat Taxi Driver, All the President's Men and 2 more at …"
  // A tied year: "Shared the prize with The Hustler at the 15th British Academy Film Awards."
  function oscarLine(f) {
    if (!f || !Number.isInteger(f.c) || (f.s !== "W" && f.s !== "N")) return "";
    const at = t(" at the {ord} {ceremony}.", { ord: ordinal(f.c), ceremony: ceremonyName });
    if (isWinner(f)) {
      const rest = ceremonyFilms(f.c).filter((x) => x !== f),
        shared = rest.filter(isWinner),
        others = rest.filter((x) => !isWinner(x)),
        total = fieldSize(f.c),
        more = total ? Math.max(0, total - 1 - rest.length) : 0;
      if (shared.length) return t("Shared the prize with {titles}", { titles: joinTitles(shared.map((x) => x.t), 0) }) + at;
      if (others.length) return t("Beat {titles}", { titles: joinTitles(others.map((x) => x.t), more) }) + at;
      return total ? t("Beat {n} other nominees", { n: total - 1 }) + at : t("Won") + at;
    }
    const w = ceremonyWinner(f.c);
    return w ? t("Lost to {title}", { title: w.t }) + at : t("Nominated") + at;
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
    award,
    // The prize by name, in the page's language ("Best Picture", "Bästa film"), or null.
    prize: award ? t(award.prize) : null,
    usedShelves,
    shelfOf,
    isWinner,
    series: localSeries(list.series || {}),
    seriesParts: (key) => films.filter((f) => f.tri === key).sort((a, b) => a.ord - b.ord),
    ticketNumber: (f) => String(ticketOrder.get(f.id)).padStart(width, "0"),
    // A film's TMDB entry and poster, where Kuvert has them: the monthly poster job writes both
    // (js/data/posters.js), starting from the entry the film table names and checking it is the film.
    // They are keyed by film id, like Swedish titles, so every list with the film has them. Your own
    // match and poster still come first (js/state/store.js, js/tmdb/client.js).
    hasPosters: films.some((f) => Object.hasOwn(posters, f.id)),
    tmdbId: (id) => (Object.hasOwn(posters, id) ? posters[id][0] : null),
    poster: (id) => (Object.hasOwn(posters, id) ? posters[id][1] : null),
    matchesSearch,
    oscarLine,
    ceremonyFilms,
    ceremonyWinner,
    decades,
    inYearOrder: () => [...films].sort(byYear),
  };
}
