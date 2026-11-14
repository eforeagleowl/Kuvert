// A film year in review, for the share picture (js/share/images.js): what was watched in one calendar
// year, across every list. Works on the passport's records (js/journeys/passport.js): one per film, with
// its date, stars, runtime and place in the ranking.

const dayOf = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000;

/** The years that have a dated watch, latest first. */
export const reviewYears = (records) => [...new Set(records.map((r) => (r.date || "").slice(0, 4)).filter((y) => /^\d{4}$/.test(y)).map(Number))].sort((a, b) => b - a);

/** The year to review: this one, or in January the one just ended; failing those, the latest with a watch. */
export function pickYear(years, now = new Date()) {
  const year = now.getFullYear();
  if (now.getMonth() === 0 && years.includes(year - 1)) return year - 1;
  return years.includes(year) ? year : (years[0] ?? null);
}

/**
 * @param {{ t: string, y: number, date: string, rating: number|null, runtime: number|null, rank: number }[]} records
 * @param {number} year
 */
export function yearReview(records, year) {
  const films = records.filter((r) => (r.date || "").startsWith(year + "-")).sort((a, b) => a.date.localeCompare(b.date));
  const days = [...new Set(films.map((f) => f.date))].sort();
  // The longest run of evenings in a row.
  let run = days.length ? 1 : 0,
    best = run;
  for (let i = 1; i < days.length; i++) {
    run = dayOf(days[i]) - dayOf(days[i - 1]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  const perMonth = Array(12).fill(0);
  for (const f of films) perMonth[+f.date.slice(5, 7) - 1]++;
  const most = Math.max(0, ...perMonth);
  const rated = films.filter((f) => Number.isFinite(f.rating));
  // The year's best: by stars, then by place in the ranking, then the later watch.
  const best5 = [...rated].sort((a, b) => b.rating - a.rating || (a.rank || 9999) - (b.rank || 9999) || b.date.localeCompare(a.date)).slice(0, 5);
  const oldest = films.reduce((o, f) => (!o || f.y < o.y ? f : o), null);
  return {
    year,
    films: films.length,
    minutes: films.reduce((n, f) => n + (f.runtime || 0), 0),
    evenings: days.length,
    run: best,
    busiest: most ? { month: perMonth.indexOf(most), films: most } : null,
    oldest,
    rated: rated.length,
    // With no stars given, the latest films stand in for the best.
    top: best5.length ? best5 : films.slice(-5).reverse(),
  };
}
