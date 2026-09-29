// Everything Stats and the ticket say about your watchthrough: pace, milestones, streaks, the painted horse.
import { byYear, decadeOf } from "./catalog.js";
import { validDate, isoToDate, isoDay, defaultWatchDate, mondayOf } from "./dates.js";

import { t, decimal } from "../i18n/index.js";
export { plural } from "../i18n/index.js";
export const starText = (r) => "★".repeat(Math.floor(r)) + (r % 1 ? "½" : "");
export const ratingLabel = (r) => starText(r) + " " + decimal(r);
export const ratingOf = (p, id) => p.reviews[id]?.rating ?? null;

// A word for the stars, in Swedish with the English beside it.
export function ratingWord(r) {
  if (!r) return null;
  if (r <= 1) return ["Usch.", "Ugh."];
  if (r <= 2) return ["Nja.", "Meh."];
  if (r <= 3) return ["Helt okej.", "Pretty good."];
  if (r <= 4) return ["Riktigt bra!", "Really good!"];
  if (r < 5) return ["Nästan perfekt!", "Nearly perfect!"];
  return ["Mästerverk!", "A masterpiece!"];
}

// A short cheer after the tally, in Swedish (English in the tooltip).
export function tallyNote(n, total) {
  if (!total) return null;
  const p = n / total;
  if (!n) return ["Förseglat", "Still sealed: open the envelope to start"];
  if (n === total) return ["Klart!", "Done!"];
  if (p < 0.25) return ["Bra start", "Good start"];
  if (p < 0.5) return ["På god väg", "Well on the way"];
  if (p < 0.75) return ["Över halvvägs", "Past halfway"];
  return ["Nästan där", "Almost there"];
}

// Newest watch first; undated films after, in year order.
export function watchedFilms(p, catalog) {
  return catalog.films
    .filter((f) => p.seen.has(f.id))
    .sort((a, b) => (p.dates[b.id] || "").localeCompare(p.dates[a.id] || "") || byYear(a, b));
}
export const rankedFilms = (p, catalog) => p.rankings.filter((id) => p.seen.has(id)).map((id) => catalog.byId.get(id)).filter(Boolean);
export function unrankedFilms(p, catalog) {
  const ranked = new Set(p.rankings);
  return watchedFilms(p, catalog).filter((f) => !ranked.has(f.id));
}
// The poster wall can follow your watch dates, your ranking, your stars or release years.
export function wallFilms(p, catalog, sort) {
  const films = watchedFilms(p, catalog);
  if (sort === "year") return [...films].sort(byYear);
  if (sort === "stars") return [...films].sort((a, b) => (ratingOf(p, b.id) || 0) - (ratingOf(p, a.id) || 0));
  if (sort === "rank") {
    const pos = new Map(p.rankings.filter((id) => p.seen.has(id)).map((id, i) => [id, i]));
    return [...films].sort((a, b) => (pos.get(a.id) ?? 1e6) - (pos.get(b.id) ?? 1e6));
  }
  return films;
}
// Left rail: stubs of the films watched most recently.
export function recentWatched(p, catalog, limit = 5) {
  return [...p.seen]
    .map((id, i) => ({ f: catalog.byId.get(id), i, d: validDate(p.dates[id]) ? p.dates[id] : "" }))
    .filter((x) => x.f)
    .sort((a, b) => (a.d === b.d ? b.i - a.i : a.d < b.d ? 1 : -1))
    .slice(0, limit)
    .map((x) => x.f);
}

export function statsData(p, catalog) {
  const { films } = catalog;
  const watched = films.filter((f) => p.seen.has(f.id)),
    known = watched.filter((f) => p.runtimes[f.id] > 0),
    rated = watched.filter((f) => ratingOf(p, f.id));
  const minutes = known.reduce((n, f) => n + p.runtimes[f.id], 0);
  const avg = (list) => (list.length ? list.reduce((n, f) => n + ratingOf(p, f.id), 0) / list.length : null);
  return {
    total: films.length,
    watched: watched.length,
    remaining: films.length - watched.length,
    skipped: p.skipped.size,
    known: known.length,
    missing: watched.length - known.length,
    minutes,
    averageRuntime: known.length ? minutes / known.length : null,
    rated: rated.length,
    averageRating: avg(rated),
    decades: catalog.decades.map((decade) => {
      const all = films.filter((f) => decadeOf(f) === decade),
        seen = all.filter((f) => p.seen.has(f.id));
      return { decade, total: all.length, watched: seen.length, average: avg(seen.filter((f) => ratingOf(p, f.id))) };
    }),
    shelves: Object.keys(catalog.shelves).map((s) => {
      const all = films.filter((f) => f.s === s),
        rated = all.filter((f) => p.seen.has(f.id) && ratingOf(p, f.id));
      return { s, total: all.length, watched: all.filter((f) => p.seen.has(f.id)).length, average: avg(rated), rated: rated.length };
    }),
  };
}

// Films per week since your first dated watch, and when you'd finish at that rate.
export function paceData(p, catalog, now = new Date()) {
  const watchedDates = catalog.films.filter((f) => p.seen.has(f.id) && validDate(p.dates[f.id])).map((f) => p.dates[f.id]).sort();
  if (watchedDates.length < 3) return null;
  const first = isoToDate(watchedDates[0]),
    today = isoToDate(defaultWatchDate(now)),
    days = Math.max(1, Math.round((today - first) / 86400000) + 1);
  if (days < 7) return null;
  const perWeek = (watchedDates.length / days) * 7,
    remaining = catalog.films.length - p.seen.size;
  const finish = remaining && perWeek > 0 ? new Date(today.getTime() + (remaining / perWeek) * 7 * 86400000) : null;
  return { perWeek, remaining, finish, days, since: watchedDates[0], count: watchedDates.length };
}
export function paceText(perWeek) {
  return perWeek >= 1 ? t("{n} a week", { n: decimal(Math.round(perWeek * 10) / 10) }) : t("1 every {n} days", { n: Math.round(7 / perWeek) });
}

export function watchDayCounts(p, catalog) {
  const byDay = new Map();
  for (const f of catalog.films) {
    const d = p.seen.has(f.id) && p.dates[f.id];
    if (validDate(d)) (byDay.get(d) || byDay.set(d, []).get(d)).push(f);
  }
  return byDay;
}
// Over every dated watch: longest run of back-to-back evenings, favourite night, busiest week.
export function eveningFacts(byDay) {
  const days = [...byDay.keys()].sort();
  if (days.length < 3) return null;
  let run = 1,
    best = 1,
    bestEnd = days[0];
  for (let i = 1; i < days.length; i++) {
    run = Math.round((isoToDate(days[i]) - isoToDate(days[i - 1])) / 86400000) === 1 ? run + 1 : 1;
    if (run > best) {
      best = run;
      bestEnd = days[i];
    }
  }
  const perWeekday = Array(7).fill(0),
    perWeek = new Map();
  for (const [iso, list] of byDay) {
    const day = isoToDate(iso);
    perWeekday[day.getDay()] += list.length;
    const key = isoDay(mondayOf(day));
    perWeek.set(key, (perWeek.get(key) || 0) + list.length);
  }
  const top = Math.max(...perWeekday),
    favourites = [1, 2, 3, 4, 5, 6, 0].filter((d) => perWeekday[d] === top); // Monday first
  let busiest = null;
  for (const [week, n] of perWeek) if (!busiest || n > busiest.n || (n === busiest.n && week > busiest.week)) busiest = { week, n };
  return { run: best, runEnd: bestEnd, favourites, top, busiest };
}

// Weeks in a row (Monday to Sunday) with a dated watch. The current week is still in play:
// an empty one doesn't break the streak until it's over. One punched hole per week.
export function weekStreak(p, catalog, now = new Date()) {
  const weeks = new Set();
  for (const f of catalog.films) if (p.seen.has(f.id) && validDate(p.dates[f.id])) weeks.add(isoDay(mondayOf(isoToDate(p.dates[f.id]))));
  const week = mondayOf(isoToDate(defaultWatchDate(now)));
  if (!weeks.has(isoDay(week))) week.setDate(week.getDate() - 7);
  let n = 0;
  while (weeks.has(isoDay(week))) {
    n++;
    week.setDate(week.getDate() - 7);
  }
  return n;
}

// Milestones are passive keepsakes. They never change draw tickets or odds.
export function computeMilestones(p, catalog) {
  const { films } = catalog;
  const watched = films.filter((f) => p.seen.has(f.id)),
    cards = [];
  const add = (id, title, description, n, target, stamp) =>
    cards.push({ id, title, description, n: Math.min(n, target), target, complete: target > 0 && n >= target, stamp });
  // Counting stamps scale with the list: 1, 25, 50, 100 (when smaller than the list) and the whole list.
  const total = films.length,
    steps = [...new Set([1, 25, 50, 100].filter((n) => n < total).concat(total))];
  for (const n of steps)
    add(
      // The final stamp keeps its old id so earned history carries across list changes.
      n === total ? "watched-all" : "watched-" + n,
      n === 1 ? t("The first ticket") : n === total ? t("The whole envelope") : t("{n} films watched", { n }),
      t(n === 1 ? "Every watchthrough begins with one film." : n === total ? "Every film in your collection, watched." : "Your cinema history, one film at a time."),
      watched.length,
      n,
      String(n),
    );
  const decades = new Set(films.map((f) => Math.floor(f.y / 10))),
    visited = new Set(watched.map((f) => Math.floor(f.y / 10)));
  add("decades", t("Across the decades"), t("Watch a film from every decade in the collection."), visited.size, decades.size, "ERA");
  const winners = films.filter(catalog.isWinner),
    winnerGoal = Math.min(10, winners.length);
  if (winnerGoal)
    add(
      "winners",
      t("Winner’s circle"),
      catalog.shelfOf(winners[0]).label === "Best Picture winner" && winnerGoal === 10
        ? t("Watch ten Best Picture winners.")
        : "Watch " + (winnerGoal === 10 ? "ten" : winnerGoal) + " " + catalog.shelfOf(winners[0]).label.toLowerCase() + "s.",
      winners.filter((f) => p.seen.has(f.id)).length,
      winnerGoal,
      String(winnerGoal),
    );
  const mentions = films.filter((f) => f.s === "H" && catalog.shelves.H);
  if (mentions.length)
    add("mentions", t("Beyond the ballot"), t("Watch every honorable mention."), mentions.filter((f) => p.seen.has(f.id)).length, mentions.length, "HM");
  for (const [key, title] of Object.entries(catalog.series)) {
    const parts = films.filter((f) => f.tri === key);
    if (parts.length) add("series-" + key, title, t("Watch every part of the series."), parts.filter((f) => p.seen.has(f.id)).length, parts.length, "SERIE");
  }
  return cards;
}
export const earnedIds = (p, catalog) => new Set(computeMilestones(p, catalog).filter((c) => c.complete).map((c) => c.id));

export const allWatched = (p, catalog) => catalog.films.every((f) => p.seen.has(f.id));
export function finaleData(p, catalog) {
  if (!allWatched(p, catalog)) return null;
  const recorded = catalog.films.map((f) => p.dates[f.id]).filter(validDate).sort();
  const complete = catalog.films.every((f) => Number.isFinite(p.runtimes[f.id]) && p.runtimes[f.id] > 0 && p.runtimes[f.id] < 1500);
  return {
    first: recorded[0] || null,
    last: recorded.at(-1) || null,
    dated: recorded.length,
    total: catalog.films.length,
    minutes: complete ? catalog.films.reduce((n, f) => n + p.runtimes[f.id], 0) : null,
  };
}

// The painted horse: carved in bare wood at the start and painted as you go: the red coat with the first
// film, the harness at a quarter, the saddle at half, its flowers at three quarters, gold details at the end.
export const PAINT_NAMES = ["bare wood", "red coat", "harness", "saddle", "saddle flowers", "gold details"];
export function paintStage(n, total) {
  if (!n || !total) return 0;
  const p = n / total;
  return n >= total ? 5 : p >= 0.75 ? 4 : p >= 0.5 ? 3 : p >= 0.25 ? 2 : 1;
}
export function nextPaint(n, total) {
  const s = paintStage(n, total);
  if (s >= 5) return null;
  return { name: PAINT_NAMES[s + 1], need: s === 0 ? 1 : s === 4 ? total : Math.ceil(total * [0, 0.25, 0.5, 0.75][s]) };
}
