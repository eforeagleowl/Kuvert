// One watched record across lists. Every list keeps a save of its own, so backups, codes and sync stay
// per list. But every list names its films by the same ids (js/data/films.js), so a film watched in one
// list is watched in each list that has it: it comes along when that list opens (carryWatched), and
// until then the Envelopes page counts it already (watchedAcross). A film un-marked or set aside in a
// list stays as that list left it.
import { KEYS } from "../compat/keys.js";
import { t, plural } from "../i18n/index.js";
import { listContext, validateProgress } from "../compat/validate.js";
import { KUVERT, FILMS } from "../data/catalogue.js";
import { readCustomLists } from "../data/lists.js";

/** Every list with a save on this device: its name, where its save is, and how its page reads it. */
export function listSaves(storage) {
  const builtin = { id: "builtin", name: KUVERT.name, key: KEYS.builtin, ctx: listContext({ films: FILMS, catalogue: KUVERT.catalogue, olderCatalogues: KUVERT.olderCatalogues, retired: KUVERT.retired }) };
  const custom = Object.values(readCustomLists(storage))
    .filter((def) => def?.id && Array.isArray(def.films) && def.films.length)
    .map((def) => ({ id: def.id, name: def.name, key: KEYS.list(def.id), ctx: listContext({ films: def.films, catalogue: def.catalogue, custom: true }) }));
  return [builtin, ...custom];
}

/** Brings over films watched in the other lists that this list has and holds no record of. */
export function carryWatched(app) {
  const { storage, store, list } = app;
  if (!storage) return 0;
  let came = 0,
    from = [];
  for (const other of listSaves(storage)) {
    if (other.id === list.id) continue;
    try {
      const raw = storage.getItem(other.key);
      const n = raw ? store.carryWatched(validateProgress(JSON.parse(raw), other.ctx)) : 0;
      if (n) from.push(other.name);
      came += n;
    } catch {
      // That list's save is unreadable: its own page deals with that.
    }
  }
  if (came) app.toast.show(from.length === 1 ? t("{films} came along from {list}.", { films: plural(came, "film"), list: from[0] }) : t("{films} came along from your other lists.", { films: plural(came, "film") }));
  return came;
}

/**
 * What each list on this device has on record, read plainly: watched, set aside, and the films it has
 * decided about itself (their stamps). The open list's comes from its store, which may be ahead of the save.
 * @returns {Map<string, { seen: Set<string>, skipped: Set<string>, stamps: Record<string,string> }>}
 */
export function listRecords(storage, open = null) {
  const records = new Map();
  for (const { id, key } of storage ? listSaves(storage) : []) {
    let d = null;
    try {
      d = JSON.parse(storage.getItem(key) || "null");
    } catch {}
    if (d && typeof d === "object") records.set(id, { seen: new Set(Array.isArray(d.seen) ? d.seen : []), skipped: new Set(Array.isArray(d.skipped) ? d.skipped : []), stamps: d.stamps && typeof d.stamps === "object" ? d.stamps : {} });
  }
  if (open) records.set(open.id, { seen: open.p.seen, skipped: open.p.skipped, stamps: open.p.stamps || {} });
  return records;
}

/** The films a list shows as watched once everything watched elsewhere has come along. */
export function watchedAcross(records, listId) {
  const own = records.get(listId) || { seen: new Set(), skipped: new Set(), stamps: {} };
  const seen = new Set(own.seen);
  for (const [id, other] of records) {
    if (id === listId) continue;
    for (const film of other.seen) if (!own.skipped.has(film) && !own.stamps[film]) seen.add(film);
  }
  return seen;
}
