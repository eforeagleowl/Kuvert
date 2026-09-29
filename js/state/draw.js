// Tonight's draw: which films can come out of the envelope, and picking one.
// A series counts as one ticket and plays in order: only its first unwatched part is in the draw.
import { decadeOf } from "./catalog.js";
import { t } from "../i18n/index.js";

export const AVAILABILITY_TTL = 24 * 60 * 60 * 1000;
export const DIRECTORY_TTL = 7 * 24 * 60 * 60 * 1000;

export const DEFAULT_SETTINGS = Object.freeze({
  country: "US",
  drawSelection: false,
  filter: "unseen",
  query: "",
  statusFilter: null,
  decadeFilter: null,
  runtimeLimit: 0,
  timeMode: "0",
  moodFilter: "",
  finishTime: "",
  finishDeadline: null,
  subscriptionOnly: false,
  selectedServices: {},
  wallSort: "recent",
});

export const moodsFor = (p, id) => (Object.hasOwn(p.moods, id) ? p.moods[id] : p.moodSuggestions[id] || []);

export function validTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
// A finish time in the past means tomorrow. Once set, the deadline never silently rolls forward.
export function finishDeadlineFor(value, now = new Date()) {
  if (!validTime(value)) return null;
  const [h, m] = value.split(":").map(Number),
    end = new Date(now);
  end.setHours(h, m, 0, 0);
  if (end <= now) end.setDate(end.getDate() + 1);
  return end.getTime();
}
export function remainingMinutes(settings, now = new Date()) {
  return settings.finishTime && Number.isFinite(settings.finishDeadline)
    ? Math.max(0, Math.floor((settings.finishDeadline - now.getTime()) / 60000))
    : null;
}

export function availabilityFresh(caches, id, region, now = Date.now()) {
  const record = caches.availability[region]?.[id];
  return !!record && Number.isFinite(record.at) && now >= record.at && now - record.at < AVAILABILITY_TTL;
}
export function subscriptionMatches(caches, settings, id, now = Date.now()) {
  const region = settings.country;
  return (
    availabilityFresh(caches, id, region, now) &&
    (caches.availability[region][id].ids || []).some((provider) => (settings.selectedServices[region] || []).includes(provider))
  );
}

export function runtimeMatches(p, settings, f, now = new Date()) {
  if (settings.timeMode === "finish" && !settings.finishTime) return false;
  const n = p.runtimes[f.id],
    limit = settings.runtimeLimit;
  if (limit && (!Number.isFinite(n) || n <= 0 || (limit === -120 ? n <= 120 : n > limit))) return false;
  if (settings.finishTime) {
    const remaining = remainingMinutes(settings, now);
    if (remaining === null || !Number.isFinite(n) || n <= 0 || n > remaining) return false;
  }
  return true;
}

/**
 * The tickets in the envelope right now.
 * @param {{ p: import("../compat/serialize.js").Progress, settings: object, caches: object, catalog: object, now?: Date }} env
 */
export function getUnits(env, { selection = env.settings.drawSelection, ignoreRuntime = false, ignoreMood = false, ignoreStreaming = false } = {}) {
  const { p, settings, caches, catalog } = env,
    now = env.now || new Date();
  const units = [],
    series = {};
  for (const f of catalog.films) {
    if (p.seen.has(f.id)) continue;
    if (f.tri) (series[f.tri] ??= []).push(f);
    else units.push({ film: f, series: null });
  }
  for (const [key, parts] of Object.entries(series)) {
    parts.sort((a, b) => a.ord - b.ord);
    units.push({ film: parts[0], series: key });
  }
  const q = settings.query.trim();
  return units.filter(
    ({ film: f }) =>
      !p.skipped.has(f.id) &&
      !env.exclude?.has(f.id) && // group night: someone in the group has seen it
      (ignoreRuntime || runtimeMatches(p, settings, f, now)) &&
      (ignoreMood || !settings.moodFilter || moodsFor(p, f.id).includes(settings.moodFilter)) &&
      (ignoreStreaming || !settings.subscriptionOnly || p.shelf.has(f.id) || subscriptionMatches(caches, settings, f.id, now.getTime())) &&
      (!selection ||
        ((!settings.statusFilter || f.s === settings.statusFilter) &&
          (settings.decadeFilter === null || decadeOf(f) === settings.decadeFilter) &&
          (!q || catalog.matchesSearch(f, q)))),
  );
}

// Draw again never hands back the film already on the ticket while another is eligible.
export function pickUnit(units, currentId, random = Math.random) {
  if (!units.length) return null;
  const others = units.filter((u) => u.film.id !== currentId);
  const pool = currentId && others.length ? others : units;
  return pool[Math.floor(random() * pool.length)];
}

// The films in the draw before time, mood and streaming are considered.
export const baseDrawFilms = (env) => getUnits(env, { ignoreRuntime: true, ignoreMood: true, ignoreStreaming: true }).map((u) => u.film);

// A film that can't be judged for tonight's filters until its details are loaded.
export function missingForDraw(env, f) {
  const { p, settings, caches } = env;
  return (
    ((settings.runtimeLimit || settings.finishTime) && !p.runtimes[f.id]) ||
    (settings.moodFilter && !Object.hasOwn(p.moods, f.id) && !Object.hasOwn(p.moodSuggestions, f.id)) ||
    (settings.subscriptionOnly && !p.shelf.has(f.id) && !availabilityFresh(caches, f.id, settings.country))
  );
}

export function nextSeriesPart(p, catalog, f) {
  if (!f?.tri) return null;
  return catalog.films.filter((x) => x.tri === f.tri && !p.seen.has(x.id) && !p.skipped.has(x.id)).sort((a, b) => a.ord - b.ord)[0] || null;
}

// Tonight's preferences as removable chips.
export function preferenceChips(settings, catalog, formatDeadline) {
  const parts = [];
  if (settings.moodFilter) parts.push({ kind: "mood", label: t(settings.moodFilter) });
  if (settings.timeMode === "finish")
    parts.push({ kind: "time", label: settings.finishTime ? t("Finish by {time}", { time: formatDeadline() }) : t("Choose a finish time") });
  else if (settings.runtimeLimit) parts.push({ kind: "time", label: t(settings.runtimeLimit === -120 ? "Over 2 hours" : "2 hours or less") });
  if (settings.subscriptionOnly) parts.push({ kind: "services", label: t("Watchable tonight") });
  if (settings.drawSelection) {
    if (settings.decadeFilter !== null) parts.push({ kind: "decade", label: t("{decade}s", { decade: settings.decadeFilter }) });
    if (settings.statusFilter) parts.push({ kind: "award", label: t(catalog.shelves[settings.statusFilter]?.plural || "") });
    if (settings.query.trim()) parts.push({ kind: "search", label: "“" + settings.query.trim() + "”" });
  }
  return parts;
}
export const hasActiveFilters = (settings) =>
  !!(
    settings.runtimeLimit ||
    settings.timeMode === "finish" ||
    settings.moodFilter ||
    settings.subscriptionOnly ||
    (settings.drawSelection && (settings.query.trim() || settings.statusFilter || settings.decadeFilter !== null))
  );
