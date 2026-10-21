// Film titles in Swedish mode: the Swedish title (titles-sv.js), with the original kept as `orig`. The catalog
// applies it to its own copy of the films (js/state/catalog.js), so every view shows the Swedish title while
// the list itself, and everything sent elsewhere (TMDB, Letterboxd, invitations, film clubs), keeps the
// original. The main title spots show the original in small type beneath (titleParts).
import { swedish } from "./index.js";
import { SV_TITLES } from "./titles-sv.js";

/** The Swedish title for a film in Swedish mode, or null. */
export function localTitle(f) {
  return swedish && f && Object.hasOwn(SV_TITLES, f.id) ? SV_TITLES[f.id] : null;
}
/** For a title element: the title, then (in Swedish mode, where it differs) the original in small type. */
export function titleParts(f) {
  if (!f?.orig) return [f?.t ?? ""];
  return [f.t, Object.assign(document.createElement("small"), { className: "title-orig", lang: "en", textContent: f.orig })];
}
/** A film the catalog doesn't hold (an envelope's preview, an invitation, the passport) titled the same way. */
export function localFilm(f) {
  const sv = localTitle(f);
  return sv ? { ...f, t: sv, orig: f.t } : f;
}
// Series names in Swedish mode, where they have one (the built-in list's; imported lists keep their own).
const SV_SERIES = { "The Godfather": "Gudfadern", "The Lord of the Rings": "Sagan om ringen" };
export const localSeries = (series) => (swedish ? Object.fromEntries(Object.entries(series).map(([k, v]) => [k, SV_SERIES[v] ?? v])) : series);
