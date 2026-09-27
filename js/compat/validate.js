// Reading saved progress: browser saves, backup files, progress codes and sync files, from every version
// Kuvert has written (the first app's "envelope" v1–3, and "kuvert" v4–7). Ported rule for rule from the
// original app, error messages included; tests/compat.test.mjs checks it against the original's output.
import { MOODS } from "../data/catalogue.js";
import { LOCAL_LEGACY_IDS } from "./legacy-ids.js";
import { decodeLegacy } from "./legacy-code.js";

/**
 * What a save is checked against: the list it belongs to.
 * @typedef {{ ids: Set<string>, catalogue: string, olderCatalogues: string[], retired: Set<string>, custom: boolean }} ListContext
 */

/** @returns {ListContext} */
export function listContext({ films, catalogue, olderCatalogues = [], retired = [], custom = false }) {
  return {
    ids: new Set(films.map((f) => f.id)),
    catalogue,
    olderCatalogues: [...olderCatalogues],
    retired: new Set(custom ? [] : retired),
    custom,
  };
}

export function plainObject(v) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
export function validDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00Z");
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
// Ratings are stored in half-star steps from 0.5 to 5.
export function validRating(r) {
  return r === null || r === undefined || (typeof r === "number" && Number.isInteger(r * 2) && r >= 0.5 && r <= 5);
}
export function validPosterPath(path) {
  return typeof path === "string" && /^\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/.test(path);
}

export function validateMoods(value = {}, ctx) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid mood tags.");
  const clean = {};
  for (const [id, tags] of Object.entries(value)) {
    if (
      !ctx.ids.has(id) ||
      !Array.isArray(tags) ||
      tags.length > MOODS.length ||
      tags.some((t) => !MOODS.includes(t)) ||
      new Set(tags).size !== tags.length
    )
      throw Error("Invalid mood tags.");
    clean[id] = [...tags];
  }
  return clean;
}
export function validateRuntimes(value = {}, ctx) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid runtimes.");
  const clean = {};
  for (const [id, n] of Object.entries(value)) {
    if (!ctx.ids.has(id) || !Number.isFinite(n) || n <= 0 || n >= 1500) throw Error("Invalid movie length.");
    clean[id] = n;
  }
  return clean;
}
export function validateRankings(value = [], ctx) {
  if (!Array.isArray(value) || value.some((id) => !ctx.ids.has(id)) || new Set(value).size !== value.length)
    throw Error("Invalid ranking.");
  return [...value];
}
export function validateVerdicts(value = {}, ctx) {
  if (!plainObject(value)) throw Error("Invalid verdicts.");
  const clean = {};
  for (const [id, v] of Object.entries(value)) {
    if (!ctx.ids.has(id) || !["yes", "no", "unsure"].includes(v)) throw Error("Invalid verdict.");
    clean[id] = v;
  }
  return clean;
}
export function validateLetterboxd(value = {}, ctx) {
  if (!plainObject(value)) throw Error("Invalid Letterboxd data.");
  const clean = {};
  for (const [id, r] of Object.entries(value)) {
    if (!ctx.ids.has(id) || !plainObject(r) || !validRating(r.rating ?? null) || (r.date != null && !validDate(r.date)))
      throw Error("Invalid Letterboxd entry.");
    clean[id] = { rating: r.rating ?? null, date: r.date ?? null };
  }
  return clean;
}
export function validateMatches(value = {}, ctx) {
  if (!plainObject(value)) throw Error("Invalid movie matches.");
  const clean = {};
  for (const [id, m] of Object.entries(value)) {
    if (!ctx.ids.has(id) || !Number.isSafeInteger(m) || m <= 0) throw Error("Invalid movie match.");
    clean[id] = m;
  }
  return clean;
}
export function validateShelf(value = [], ctx) {
  if (!Array.isArray(value) || value.some((id) => !ctx.ids.has(id))) throw Error("Invalid shelf.");
  return [...new Set(value)];
}
export function validateSnubs(value = {}, ctx) {
  if (!plainObject(value)) throw Error("Invalid should-have-won picks.");
  const clean = {};
  for (const [id, v] of Object.entries(value)) {
    if (!ctx.ids.has(id) || !(v === "other" || ctx.ids.has(v))) throw Error("Invalid should-have-won pick.");
    clean[id] = v;
  }
  return clean;
}
export function cleanMoodHints(value, ctx) {
  const clean = {};
  if (plainObject(value))
    for (const [id, tags] of Object.entries(value))
      if (ctx.ids.has(id) && Array.isArray(tags) && tags.every((t) => MOODS.includes(t))) clean[id] = [...new Set(tags)];
  return clean;
}
export function restorePosterPaths(value, ctx) {
  const clean = {};
  if (value && typeof value === "object" && !Array.isArray(value))
    for (const [id, path] of Object.entries(value))
      if (ctx.ids.has(id) && (path === null || validPosterPath(path))) clean[id] = path;
  return clean;
}

// New in this app, ignored by the original: when each film's personal data last changed, so sync can
// merge film by film. Keys are film ids, plus "$ranking" and "$current". Bad entries are dropped, never fatal.
export const STAMP_KEYS = ["$ranking", "$current"];
export function cleanStamps(value, ctx) {
  const clean = {};
  if (plainObject(value))
    for (const [k, at] of Object.entries(value))
      if ((ctx.ids.has(k) || STAMP_KEYS.includes(k)) && typeof at === "string" && Number.isFinite(Date.parse(at))) clean[k] = at;
  return clean;
}

export function validateExtras(d, ctx) {
  const skip = d.skipped ?? [],
    hist = d.recent ?? [],
    notes = d.reviews ?? {};
  if (
    !Array.isArray(skip) ||
    skip.some((id) => !ctx.ids.has(id)) ||
    !Array.isArray(hist) ||
    hist.length > 5 ||
    hist.some((id) => !ctx.ids.has(id)) ||
    new Set(hist).size !== hist.length
  )
    throw Error("Invalid skipped movies or recent picks.");
  if (!notes || typeof notes !== "object" || Array.isArray(notes)) throw Error("Invalid movie notes.");
  const clean = {};
  for (const [id, r] of Object.entries(notes)) {
    if (
      !ctx.ids.has(id) ||
      !r ||
      typeof r !== "object" ||
      Array.isArray(r) ||
      typeof r.note !== "string" ||
      r.note.length > 500 ||
      !validRating(r.rating)
    )
      throw Error("Invalid movie note or rating.");
    clean[id] = { note: r.note, rating: r.rating };
  }
  return {
    skipped: new Set(skip),
    recent: [...hist],
    reviews: clean,
    moods: validateMoods(d.moods, ctx),
    runtimes: validateRuntimes(d.runtimes, ctx),
    rankings: validateRankings(d.rankings, ctx),
    verdicts: validateVerdicts(d.verdicts, ctx),
    lbx: validateLetterboxd(d.lbx, ctx),
    matches: validateMatches(d.matches, ctx),
    shelf: validateShelf(d.shelf, ctx),
    snubs: validateSnubs(d.snubs, ctx),
    drawnOn: d.drawnOn == null ? null : validDate(d.drawnOn) ? d.drawnOn : null,
    // Loaded film details travel too, so a new device starts with posters and moods.
    posterPaths: restorePosterPaths(d.posterPaths, ctx),
    moodSuggestions: cleanMoodHints(d.moodSuggestions, ctx),
  };
}

// Removes every mention of a retired film from saved progress (watched, dates, stars, ranking…).
export function dropRetired(v, retired, depth = 0) {
  if (!retired.size || depth > 6 || !v || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.filter((x) => !(typeof x === "string" && retired.has(x))).map((x) => dropRetired(x, retired, depth + 1));
  const out = {};
  for (const [k, x] of Object.entries(v)) {
    if (retired.has(k) || (typeof x === "string" && retired.has(x))) continue;
    out[k] = dropRetired(x, retired, depth + 1);
  }
  return out;
}

/**
 * Checks a saved progress object and returns it in memory form (Sets for seen, skipped).
 * @param {object} d the parsed save
 * @param {ListContext} ctx the list it should belong to
 */
export function validateProgress(d, ctx, { browserLegacy = false, legacyIds = LOCAL_LEGACY_IDS } = {}) {
  if (!d || typeof d !== "object" || Array.isArray(d)) throw Error("This is not a progress file.");
  const RETIRED = ctx.retired;
  if (RETIRED.size && d.catalogue !== ctx.catalogue) {
    const current = RETIRED.has(d.current) ? null : d.current;
    d = { ...dropRetired(d, RETIRED), current, catalogue: d.catalogue };
  }
  const modern = d.app === "kuvert" && [4, 5, 6, 7].includes(d.v);
  const legacy = (d.app === "envelope" && [1, 2, 3].includes(d.v)) || (browserLegacy && !d.app && !d.v);
  if (!modern && !legacy) throw Error("Unsupported progress file or version.");
  if (modern && ![ctx.catalogue, ...ctx.olderCatalogues].includes(d.catalogue))
    throw Error(
      String(d.catalogue || "").startsWith("custom:") || ctx.custom
        ? "This backup belongs to a different movie list. Switch lists in Settings first."
        : "This backup uses a different catalogue version.",
    );
  let marks;
  if (Array.isArray(d.seen))
    marks = d.seen
      .map((id) => {
        if (legacy) {
          if (!Number.isInteger(id) || id < 0 || id >= legacyIds.length) throw Error("Unknown film in backup.");
          return legacyIds[id];
        }
        if (typeof id !== "string" || !ctx.ids.has(id)) throw Error("Unknown film in backup.");
        return id;
      })
      .filter((id) => !RETIRED.has(id));
  else if (legacy && typeof d.code === "string") marks = [...decodeLegacy(d.code, legacyIds)].filter((id) => !RETIRED.has(id));
  else throw Error("The backup is missing watched films.");
  const importedSeen = new Set(marks),
    importedDates = {};
  if (d.dates !== undefined) {
    if (!d.dates || typeof d.dates !== "object" || Array.isArray(d.dates)) throw Error("Invalid watch dates.");
    for (const [key, value] of Object.entries(d.dates)) {
      const id = legacy && /^\d+$/.test(key) ? legacyIds[Number(key)] : key;
      if (RETIRED.has(id)) continue;
      if (!ctx.ids.has(id) || !importedSeen.has(id) || !validDate(value)) throw Error("Invalid watch date in backup.");
      importedDates[id] = value;
    }
  }
  const pick = modern ? d.current : null;
  if (pick != null && (!ctx.ids.has(pick) || importedSeen.has(pick))) throw Error("Invalid saved movie selection.");
  if (d.saved != null && (typeof d.saved !== "string" || !Number.isFinite(Date.parse(d.saved))))
    throw Error("Invalid backup timestamp.");
  const extras = validateExtras(modern ? d : {}, ctx);
  if ([...extras.skipped].some((id) => importedSeen.has(id))) throw Error("A movie cannot be watched and skipped.");
  return {
    seen: importedSeen,
    dates: importedDates,
    current: pick || null,
    saved: d.saved || null,
    legacy,
    ...extras,
    stamps: modern ? cleanStamps(d.stamps, ctx) : {},
  };
}

// The first app's backups hold only a bit-packed code: those need the catalogue chosen before reading.
export function isCodeOnlyLegacyBackup(obj) {
  return obj?.app === "envelope" && [1, 2, 3].includes(obj.v) && !Array.isArray(obj.seen) && typeof obj.code === "string";
}
