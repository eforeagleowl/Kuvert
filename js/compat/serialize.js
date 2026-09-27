// Writing saves in the exact shape the original app writes (key order included), so a backup, a code or
// a browser save made here reads the same in either app. Only `stamps` is new, and old copies ignore it.
import { checksum } from "./codes.js";

/**
 * Personal progress for one list. Sets hold film ids.
 * @typedef {{
 *   seen: Set<string>, dates: Record<string,string>, current: string|null, drawnOn: string|null,
 *   skipped: Set<string>, reviews: Record<string,{note:string,rating:number|null}>, recent: string[],
 *   moods: Record<string,string[]>, runtimes: Record<string,number>, rankings: string[],
 *   verdicts: Record<string,string>, lbx: Record<string,{rating:number|null,date:string|null}>,
 *   matches: Record<string,number>, shelf: Set<string>, snubs: Record<string,string>,
 *   posterPaths: Record<string,string|null>, moodSuggestions: Record<string,string[]>,
 *   saved: string|null, stamps: Record<string,string>
 * }} Progress
 */

const copyReviews = (value) => Object.fromEntries(Object.entries(value).map(([id, r]) => [id, { ...r }]));
const cloneMoods = (value) => Object.fromEntries(Object.entries(value).map(([id, tags]) => [id, [...tags]]));

/**
 * The v7 save. `list` is the imported list's definition (custom lists only).
 * @param {Progress} p
 * @param {{ ids: Set<string>, catalogue: string, custom?: boolean, definition?: object|null }} ctx
 */
export function stateData(p, ctx) {
  const current = p.current && !p.seen.has(p.current) ? p.current : null;
  const data = {
    app: "kuvert",
    v: 7,
    catalogue: ctx.catalogue,
    saved: p.saved,
    seen: [...p.seen].sort(),
    dates: { ...p.dates },
    current,
    skipped: [...p.skipped].sort(),
    reviews: copyReviews(p.reviews),
    recent: [...p.recent],
    moods: cloneMoods(p.moods),
    runtimes: { ...p.runtimes },
    rankings: p.rankings.filter((id) => p.seen.has(id)),
    verdicts: { ...p.verdicts },
    lbx: { ...p.lbx },
    matches: Object.fromEntries(Object.entries(p.matches).filter(([id]) => ctx.ids.has(id))),
    shelf: [...p.shelf].sort(),
    snubs: { ...p.snubs },
    drawnOn: current ? p.drawnOn : null,
    posterPaths: Object.fromEntries(Object.entries(p.posterPaths).filter(([id]) => ctx.ids.has(id))),
    moodSuggestions: cloneMoods(p.moodSuggestions),
    ...(ctx.custom ? { list: ctx.definition } : {}),
  };
  if (p.stamps && Object.keys(p.stamps).length) data.stamps = { ...p.stamps };
  return data;
}

// A fingerprint of the personal data, the same one the original app computes. Sync compares these to
// tell which side changed since the last sync. Stamps are left out on purpose: they only move with data.
export function progressSignature(data) {
  const sorted = (o) => Object.fromEntries(Object.entries(o || {}).sort(([a], [b]) => a.localeCompare(b)));
  return checksum(
    JSON.stringify({
      seen: [...data.seen].sort(),
      dates: sorted(data.dates),
      skipped: [...(data.skipped || [])].sort(),
      reviews: sorted(data.reviews),
      recent: data.recent || [],
      current: data.current || null,
      moods: sorted(data.moods),
      runtimes: sorted(data.runtimes),
      rankings: data.rankings || [],
      verdicts: sorted(data.verdicts),
      lbx: sorted(data.lbx),
      matches: sorted(data.matches),
      shelf: [...(data.shelf || [])].sort(),
      snubs: sorted(data.snubs),
      drawnOn: data.drawnOn || null,
      posterPaths: sorted(data.posterPaths),
      moodSuggestions: sorted(data.moodSuggestions),
    }),
  );
}

/**
 * The browser save under kuvert:v4 / kuvert:list:<id>: the v7 save plus settings and caches.
 * The original app reads every field here; fields it doesn't know are ignored.
 */
export function browserSave(p, ctx, { settings, lastBackup = null, availability = {}, providerDirectories = {} }) {
  return {
    ...stateData(p, ctx),
    settings: {
      country: settings.country,
      drawSelection: settings.drawSelection,
      filter: settings.filter,
      query: settings.query,
      statusFilter: settings.statusFilter,
      decadeFilter: settings.decadeFilter,
      runtimeLimit: settings.runtimeLimit,
      timeMode: settings.timeMode,
      moodFilter: settings.moodFilter,
      finishTime: settings.finishTime,
      finishDeadline: settings.finishDeadline,
      subscriptionOnly: settings.subscriptionOnly,
      selectedServices: settings.selectedServices,
      wallSort: settings.wallSort,
    },
    matches: p.matches,
    runtimes: p.runtimes,
    moodSuggestions: p.moodSuggestions,
    posterPaths: p.posterPaths,
    lastBackup,
    availability,
    providerDirectories,
  };
}
