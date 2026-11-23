// What Kuvert remembers when a day comes round: the film you watched on this day in an earlier year
// (a line on Tonight, js/views/evening.js), and the day you watched your first film here, which the
// dala horse keeps as a day of its own (js/ui/horse.js). A day is one of Kuvert's, which lasts until
// four in the morning (js/state/dates.js). Only dated watches count: a film ticked off as seen before
// has no day to come round.
import { defaultWatchDate, validDate } from "./dates.js";
import { ratingOf } from "./stats.js";

const leap = (year) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

/**
 * How many years ago a day ("YYYY-MM-DD") was, if it comes round on `today`: the same month and day in a
 * later year. 0 when it doesn't. The 29th of February comes round on the 28th in a year without one.
 */
export function yearsAgo(day, today) {
  const years = Number(today.slice(0, 4)) - Number(day.slice(0, 4));
  if (years < 1) return 0;
  const then = day.slice(5),
    now = today.slice(5);
  return then === now || (then === "02-29" && now === "02-28" && !leap(Number(today.slice(0, 4)))) ? years : 0;
}

/**
 * The film to remember tonight: { years, film, rating, more }, or null. The nearest year wins, and within
 * it the film you rated highest; `more` is how many other films share that evening.
 */
export function onThisDay(p, catalog, now = new Date()) {
  const today = defaultWatchDate(now);
  const found = catalog.films
    .filter((f) => p.seen.has(f.id) && validDate(p.dates[f.id]))
    .map((film) => ({ film, years: yearsAgo(p.dates[film.id], today), rating: ratingOf(p, film.id) }))
    .filter((m) => m.years)
    .sort((a, b) => a.years - b.years || (b.rating || 0) - (a.rating || 0));
  if (!found.length) return null;
  return { ...found[0], more: found.filter((m) => m.years === found[0].years).length - 1 };
}

/** The first film you watched here, by its date: { film, date }, or null when nothing is dated. */
export function firstFilm(p, catalog) {
  let first = null;
  for (const film of catalog.films) {
    const date = p.dates[film.id];
    if (p.seen.has(film.id) && validDate(date) && (!first || date < first.date)) first = { film, date };
  }
  return first;
}

/**
 * The horse's own day: the day your first film here comes round. { years, films, greeting }, or null on
 * any other day. The greeting is the horse's, so it is in Swedish: "Ett år och 44 filmer!"
 */
export function ownDay(p, catalog, now = new Date()) {
  const first = firstFilm(p, catalog),
    years = first ? yearsAgo(first.date, defaultWatchDate(now)) : 0;
  if (!years) return null;
  const films = p.seen.size;
  return { years, films, first: first.film, greeting: (years === 1 ? "Ett" : years) + " år och " + films + (films === 1 ? " film!" : " filmer!") };
}
