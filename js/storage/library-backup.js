// A whole-library backup is separate from the original, single-list v7 format. It carries every list
// and its personal progress, plus explicitly allowed preferences. Credentials and API caches never
// enter this file. A restore is validated and planned in full before any browser key is changed.
import { KEYS } from "../compat/keys.js";
import { validateProgress, plainObject, validPosterPath, validateMoods, validDate } from "../compat/validate.js";
import { browserSave } from "../compat/serialize.js";
import { resolveList, buildListDefinition } from "../data/lists.js";
import { makeCatalog } from "../state/catalog.js";
import { Store } from "../state/store.js";
import { emptyProgress, keepLocal } from "../state/merge.js";

export const LIBRARY_BACKUP_FILE = "kuvert-library.json";
export const LIBRARY_BACKUP_LIMIT = 10000000;
const MAX_LISTS = 200;
const BAD_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const PREF_RULES = new Map([
  [KEYS.lang, (s) => ["sv", "en"].includes(s)],
  [KEYS.sounds, (s) => ["on", "off"].includes(s)],
  [KEYS.welcomed, (s) => s === "1"],
  [KEYS.mode, (s) => s === "seagal"],
  [KEYS.station("sound"), (s) => ["on", "off"].includes(s)],
  [KEYS.station("voice"), (s) => ["on", "off"].includes(s)],
  ["kuvert:journeys:v1", validJourneys],
  [KEYS.seagal("cowardice"), (s) => { try { const n = JSON.parse(s); return Number.isSafeInteger(n) && n >= 0; } catch { return false; } }],
  [KEYS.seagal("marks"), (s) => { try { const marks = JSON.parse(s); return Array.isArray(marks) && marks.length <= 500 && marks.every((n) => Number.isSafeInteger(n) && n >= 0); } catch { return false; } }],
  [KEYS.seagal("hardToKill"), (s) => s === "true" || s === "false"],
]);

function validJourneys(text) {
  try {
    const value = JSON.parse(text);
    assertObject(value, "journeys");
    if (Object.keys(value).some((key) => key !== "ballots")) return false;
    assertObject(value.ballots, "ballots");
    if (Object.keys(value.ballots).length > 150) return false;
    return Object.entries(value.ballots).every(([id, choice]) => {
      assertObject(choice, "ballot choice");
      return safeId(id) && Object.keys(choice).every((key) => ["winnerId", "date"].includes(key)) && safeId(choice.winnerId) && validDate(choice.date);
    });
  } catch { return false; }
}

function assertObject(value, label) {
  if (!plainObject(value)) throw Error("Invalid " + label + ".");
  if (Object.keys(value).some((k) => BAD_KEYS.has(k))) throw Error("Unsafe key in " + label + ".");
}
function safeId(id) {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,120}$/.test(id) && !BAD_KEYS.has(id);
}
function builtinList() {
  return resolveList({ getItem: () => null });
}
function listFor(definition) {
  if (!definition) return builtinList();
  return { ...definition, custom: true, definition, storageKey: KEYS.list(definition.id), olderCatalogues: [], retired: [] };
}
function checkedDefinition(raw, id) {
  assertObject(raw, "list definition");
  if (!safeId(id) || id === "builtin" || raw.id !== id) throw Error("Invalid library list ID.");
  if (typeof raw.name !== "string" || !raw.name.trim() || raw.name.length > 40) throw Error("Invalid library list name.");
  if (raw.subtitle != null && (typeof raw.subtitle !== "string" || raw.subtitle.length > 120)) throw Error("Invalid library list subtitle.");
  if (!Array.isArray(raw.films) || !raw.films.length || raw.films.length > 2000) throw Error("Invalid library films.");
  const ids = new Set();
  for (const f of raw.films) {
    assertObject(f, "film definition");
    if (!safeId(f.id) || ids.has(f.id)) throw Error("Invalid or duplicate library film ID.");
    ids.add(f.id);
    if (typeof f.t !== "string" || !f.t.trim() || f.t.length > 200) throw Error("Invalid library film title.");
  }
  if (raw.series != null) {
    assertObject(raw.series, "series");
    if (Object.entries(raw.series).some(([k, v]) => !safeId(k) || typeof v !== "string" || v.length > 200)) throw Error("Invalid library series.");
  }
  if (raw.shelves != null) {
    assertObject(raw.shelves, "shelves");
    for (const [k, shelf] of Object.entries(raw.shelves)) {
      if (!["W", "N", "H"].includes(k)) throw Error("Invalid library shelf.");
      assertObject(shelf, "shelf");
      if (Object.entries(shelf).some(([key, v]) => !["chip", "label", "plural", "winner"].includes(key) || (key === "winner" ? typeof v !== "boolean" : typeof v !== "string" || v.length > 200)))
        throw Error("Invalid library shelf labels.");
    }
  }
  const clean = buildListDefinition({ ...raw, id });
  if (typeof raw.catalogue !== "string" || !raw.catalogue.startsWith("custom:" + id + ":") || raw.catalogue.length > 200) throw Error("Invalid library catalog.");
  clean.catalogue = raw.catalogue;
  if (raw.version != null) {
    if (!Number.isSafeInteger(raw.version) || raw.version < 1) throw Error("Invalid library list version.");
    clean.version = raw.version;
  }
  return clean;
}

// Existing browser preferences are normalized with the same reader as the app. Backup input is
// additionally checked, so a malformed final list cannot be silently repaired after earlier writes.
function checkedSettings(raw, store, { strict = true } = {}) {
  if (raw == null) raw = {};
  assertObject(raw, "library settings");
  if (strict) {
    const fields = Object.keys(store.settings);
    if (Object.keys(raw).some((k) => !fields.includes(k))) throw Error("Unknown library setting.");
    for (const k of ["drawSelection", "subscriptionOnly"]) if (raw[k] != null && typeof raw[k] !== "boolean") throw Error("Invalid library setting: " + k + ".");
    if (raw.country != null && (typeof raw.country !== "string" || !/^[A-Z]{2}$/.test(raw.country))) throw Error("Invalid library country.");
    if (raw.query != null && (typeof raw.query !== "string" || raw.query.length > 2000)) throw Error("Invalid library search.");
    if (raw.runtimeLimit != null && ![0, 90, 120, -120].includes(raw.runtimeLimit)) throw Error("Invalid library time limit.");
    if (raw.timeMode != null && !["0", "120", "-120", "finish"].includes(raw.timeMode)) throw Error("Invalid library time mode.");
    if (raw.filter != null && !["unseen", "all", "skipped", "recent", "missing", "shelf"].includes(raw.filter)) throw Error("Invalid library filter.");
    if (raw.wallSort != null && !["recent", "rank", "stars", "year"].includes(raw.wallSort)) throw Error("Invalid library wall order.");
    if (raw.decadeFilter != null && !Number.isInteger(raw.decadeFilter)) throw Error("Invalid library decade.");
    if (raw.statusFilter != null && !store.catalog.shelves[raw.statusFilter]) throw Error("Invalid library shelf filter.");
    if (raw.finishTime != null && raw.finishTime !== "" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.finishTime)) throw Error("Invalid library finish time.");
    if (raw.finishDeadline != null && !Number.isFinite(raw.finishDeadline)) throw Error("Invalid library finish deadline.");
    if (raw.moodFilter != null && raw.moodFilter !== "") validateMoods({ [store.catalog.films[0].id]: [raw.moodFilter] }, store.catalog.ctx);
    if (raw.selectedServices != null) {
      assertObject(raw.selectedServices, "selected services");
      if (Object.entries(raw.selectedServices).some(([region, ids]) => !/^[A-Z]{2}$/.test(region) || !Array.isArray(ids) || ids.some((x) => !Number.isSafeInteger(x) || x <= 0)))
        throw Error("Invalid library services.");
    }
  }
  store.loadSettings(raw, {});
  return structuredClone(store.settings);
}

function checkedEntry(raw, { strictSettings = true, browserLegacy = false } = {}) {
  assertObject(raw, "library entry");
  if (!safeId(raw.id)) throw Error("Invalid library list ID.");
  const definition = raw.id === "builtin" ? null : checkedDefinition(raw.definition, raw.id);
  if (raw.id === "builtin" && raw.definition != null) throw Error("The built-in catalog cannot be replaced by a backup.");
  const list = listFor(definition), catalog = makeCatalog(list), store = new Store({ list, catalog });
  const d = validateProgress(raw.progress, catalog.ctx, { browserLegacy });
  // These detail fields are intentionally lenient for legacy single-list saves. Full-library files
  // are strict, including fields the old reader drops when invalid.
  if (strictSettings) {
    if (raw.progress.drawnOn != null && !validDate(raw.progress.drawnOn)) throw Error("Invalid library ticket date.");
    if (raw.progress.posterPaths != null) {
      assertObject(raw.progress.posterPaths, "poster paths");
      if (Object.entries(raw.progress.posterPaths).some(([id, path]) => !catalog.ids.has(id) || (path !== null && !validPosterPath(path)))) throw Error("Invalid library poster path.");
    }
    if (raw.progress.moodSuggestions != null) validateMoods(raw.progress.moodSuggestions, catalog.ctx);
    if (raw.progress.stamps != null) {
      assertObject(raw.progress.stamps, "change times");
      if (Object.entries(raw.progress.stamps).some(([id, at]) => !(catalog.ids.has(id) || ["$current", "$ranking"].includes(id)) || typeof at !== "string" || !Number.isFinite(Date.parse(at))))
        throw Error("Invalid library change time.");
    }
  }
  store.p = store.fromValidated(d, emptyProgress());
  const settings = checkedSettings(raw.settings, store, { strict: strictSettings });
  return { id: raw.id, definition, progress: store.data(), settings };
}

function checkedGroup(group, ids) {
  assertObject(group, "group night");
  if (typeof group.on !== "boolean" || !Array.isArray(group.people) || group.people.length > 12) throw Error("Invalid library group night.");
  const people = group.people.map((p) => {
    assertObject(p, "group member");
    if (typeof p.name !== "string" || !p.name.trim() || p.name.length > 40 || !Array.isArray(p.seen) || p.seen.some((id) => !ids.has(id))) throw Error("Invalid library group member.");
    if (p.added != null && (typeof p.added !== "string" || !Number.isFinite(Date.parse(p.added)))) throw Error("Invalid library group timestamp.");
    return { name: p.name, seen: [...new Set(p.seen)], added: p.added || null };
  });
  return { on: group.on && people.length > 0, people };
}

export function validateLibraryBackup(raw) {
  assertObject(raw, "library backup");
  if (raw.app !== "kuvert-library" || raw.v !== 1) throw Error("This is not a supported Kuvert library backup.");
  if (typeof raw.exportedAt !== "string" || !Number.isFinite(Date.parse(raw.exportedAt))) throw Error("Invalid library backup timestamp.");
  if (!Array.isArray(raw.lists) || !raw.lists.length || raw.lists.length > MAX_LISTS) throw Error("Invalid library list count.");
  const lists = raw.lists.map((entry) => checkedEntry(entry));
  const ids = new Set(lists.map((x) => x.id));
  if (ids.size !== lists.length || !ids.has("builtin")) throw Error("A library backup needs one built-in list and unique custom lists.");
  if (!ids.has(raw.activeList)) throw Error("Invalid active list in library backup.");
  assertObject(raw.preferences || {}, "library preferences");
  const preferences = {};
  for (const [key, value] of Object.entries(raw.preferences || {})) {
    if (!PREF_RULES.has(key) || typeof value !== "string" || !PREF_RULES.get(key)(value)) throw Error("Unknown or invalid library preference.");
    preferences[key] = value;
  }
  assertObject(raw.groups || {}, "library groups");
  const groups = {};
  for (const [id, group] of Object.entries(raw.groups || {})) {
    if (!ids.has(id)) throw Error("A library group belongs to an unknown list.");
    const entry = lists.find((x) => x.id === id);
    groups[id] = checkedGroup(group, makeCatalog(listFor(entry.definition)).ids);
  }
  return { app: "kuvert-library", v: 1, exportedAt: raw.exportedAt, activeList: raw.activeList, lists, preferences, groups };
}

/** Creates a JSON-ready snapshot; never writes storage. Unreadable saves are reported, not discarded. */
export function exportLibrary(storage, { store = null, now = () => new Date() } = {}) {
  if (!storage) throw Error("Browser storage is unavailable. Export your current list's progress instead.");
  let definitions;
  try { definitions = JSON.parse(storage.getItem(KEYS.lists) || "{}"); } catch { throw Error("Your saved list definitions could not be read. No library backup was created."); }
  assertObject(definitions, "saved list definitions");
  if (Object.keys(definitions).length >= MAX_LISTS) throw Error("The library has too many lists for one backup.");
  const entries = [{ id: "builtin", definition: null }, ...Object.entries(definitions).map(([id, definition]) => ({ id, definition }))];
  const lists = entries.map((entry) => {
    const key = entry.id === "builtin" ? KEYS.builtin : KEYS.list(entry.id);
    if (store?.list.id === entry.id) {
      if (store.writeLocked) throw Error("The active list's saved progress could not be read. Restore it before backing up the library.");
      store.reconcileStorage?.();
      return checkedEntry({ ...entry, progress: store.data(), settings: store.settings }, { strictSettings: false });
    }
    const list = listFor(entry.definition), scratch = new Store({ list, catalog: makeCatalog(list) });
    const raw = storage.getItem(key), old = entry.id === "builtin" && !raw ? storage.getItem(KEYS.oldBuiltin) : null;
    let save;
    try { save = raw || old ? JSON.parse(raw || old) : scratch.data(); } catch { throw Error("Saved progress for “" + list.name + "” could not be read. No library backup was created."); }
    return checkedEntry({ ...entry, progress: save, settings: save.settings || {} }, { strictSettings: false, browserLegacy: !!old });
  });
  const preferences = {};
  for (const [key, valid] of PREF_RULES) {
    const value = storage.getItem(key);
    if (value != null && valid(value)) preferences[key] = value;
  }
  const groups = {};
  for (const entry of lists) {
    const raw = storage.getItem(KEYS.group(entry.id));
    if (raw) {
      let group;
      try { group = JSON.parse(raw); } catch { throw Error("A saved group night could not be read. No library backup was created."); }
      groups[entry.id] = checkedGroup(group, makeCatalog(listFor(entry.definition)).ids);
    }
  }
  const active = storage.getItem(KEYS.activeList) || "builtin";
  return validateLibraryBackup({ app: "kuvert-library", v: 1, exportedAt: now().toISOString(), activeList: lists.some((x) => x.id === active) ? active : "builtin", lists, preferences, groups });
}

/** Accepts a File, JSON text or parsed object. Existing single-list readers stay unchanged. */
export async function readLibraryBackup(input) {
  let raw = input;
  if (input && typeof input.text === "function") {
    if (input.size > LIBRARY_BACKUP_LIMIT) throw Error("That file is too large to be a Kuvert library backup.");
    raw = await input.text();
  }
  if (typeof raw === "string") {
    if (raw.length > LIBRARY_BACKUP_LIMIT) throw Error("That file is too large to be a Kuvert library backup.");
    try { raw = JSON.parse(raw); } catch { throw Error("That file is not valid JSON."); }
  }
  return validateLibraryBackup(raw);
}

function mergeDefinition(local, incoming) {
  const films = new Map(local.films.map((f) => [f.id, f]));
  for (const f of incoming.films) {
    const own = films.get(f.id);
    if (own && (own.t !== f.t || own.y !== f.y)) throw Error("The same list ID describes different films. Use Replace after checking both lists.");
    if (!own) films.set(f.id, f);
  }
  return checkedDefinition({ ...local, films: [...films.values()], series: { ...incoming.series, ...local.series }, catalogue: "custom:" + local.id + ":" + films.size }, local.id);
}
function serializeEntry(entry, previous = null) {
  const list = listFor(entry.definition), store = new Store({ list, catalog: makeCatalog(list) });
  store.p = store.fromValidated(validateProgress({ ...entry.progress, catalogue: list.catalogue }, store.catalog.ctx), emptyProgress());
  store.settings = entry.settings;
  const record = (data, id) => JSON.stringify([(data.seen || []).includes(id), (data.skipped || []).includes(id), (data.shelf || []).includes(id), ...["dates", "reviews", "verdicts", "snubs", "moods", "lbx"].map((field) => data[field]?.[id] ?? null)]);
  const changed = [...store.catalog.ids].filter((id) => !previous || record(previous, id) !== record(entry.progress, id));
  if (!previous || JSON.stringify([previous.current, previous.drawnOn]) !== JSON.stringify([entry.progress.current, entry.progress.drawnOn])) changed.push("$current");
  if (!previous || JSON.stringify(previous.rankings) !== JSON.stringify(entry.progress.rankings)) changed.push("$ranking");
  if (changed.length) {
    const newest = Math.max(Date.now(), ...Object.values(previous?.stamps || {}).map((s) => Date.parse(s) || 0), ...Object.values(store.p.stamps).map((s) => Date.parse(s) || 0));
    const at = new Date(newest + 1).toISOString();
    for (const key of changed) store.p.stamps[key] = at;
    store.p.saved = at;
  }
  return JSON.stringify(browserSave(store.p, store.ctx, { settings: store.settings }));
}
function planRestore(storage, snapshot, mode, liveStore = null) {
  if (!["merge", "replace"].includes(mode)) throw Error("Choose Merge or Replace for the library restore.");
  const incoming = validateLibraryBackup(snapshot);
  const warnings = [];
  let local;
  try { local = exportLibrary(storage, { store: liveStore }); }
  catch (error) {
    if (mode === "merge") throw error;
    // Replace is also the recovery path for unreadable progress. Preserve original raw keys for
    // rollback; do not require that broken saves validate before a known-good backup can replace them.
    const ids = new Set(["builtin"]);
    try {
      const defs = JSON.parse(storage.getItem(KEYS.lists) || "{}");
      if (plainObject(defs)) for (const id of Object.keys(defs)) if (safeId(id)) ids.add(id);
    } catch {}
    if (Number.isSafeInteger(storage.length) && typeof storage.key === "function") {
      for (let n = 0; n < storage.length; n++) {
        const key = storage.key(n);
        if (key?.startsWith("kuvert:list:") && safeId(key.slice(12))) ids.add(key.slice(12));
      }
    }
    local = { lists: [...ids].map((id) => ({ id, progress: { seen: [] }, definition: null })), preferences: {}, groups: {}, activeList: "builtin" };
    warnings.push("The current library could not be fully read. Watched counts may be incomplete. Original saved keys are retained for rollback.");
  }
  const before = new Map(local.lists.map((x) => [x.id, x]));
  let lists = incoming.lists;
  if (mode === "merge") {
    const merged = new Map(before);
    for (const entry of incoming.lists) {
      const own = before.get(entry.id);
      if (!own) { merged.set(entry.id, entry); continue; }
      const definition = entry.id === "builtin" ? null : mergeDefinition(own.definition, entry.definition);
      if (definition && definition.films.length !== own.definition.films.length) warnings.push("Merge adds films to “" + own.definition.name + "”.");
      const list = listFor(definition), scratch = new Store({ list, catalog: makeCatalog(list) });
      const a = scratch.fromValidated(validateProgress({ ...own.progress, catalogue: list.catalogue }, scratch.catalog.ctx), emptyProgress());
      const b = scratch.fromValidated(validateProgress({ ...entry.progress, catalogue: list.catalogue }, scratch.catalog.ctx), emptyProgress());
      scratch.p = keepLocal(a, b);
      merged.set(entry.id, { id: entry.id, definition, progress: scratch.data(), settings: own.settings });
    }
    lists = [...merged.values()];
  }
  const preferences = mode === "merge" ? { ...incoming.preferences, ...local.preferences } : incoming.preferences;
  const groups = mode === "merge" ? { ...incoming.groups, ...local.groups } : incoming.groups;
  if (mode === "merge") {
    const key = "kuvert:journeys:v1";
    if (incoming.preferences[key] && local.preferences[key]) preferences[key] = JSON.stringify({ ballots: { ...JSON.parse(incoming.preferences[key]).ballots, ...JSON.parse(local.preferences[key]).ballots } });
    for (const [id, group] of Object.entries(incoming.groups)) {
      const own = local.groups[id];
      if (!own) continue;
      const people = new Map(group.people.map((person) => [person.name.toLowerCase(), person]));
      for (const person of own.people) {
        const remote = people.get(person.name.toLowerCase());
        people.set(person.name.toLowerCase(), { ...person, seen: [...new Set([...person.seen, ...(remote?.seen || [])])] });
      }
      groups[id] = { on: own.on, people: [...people.values()] };
    }
  }
  const activeList = mode === "merge" ? local.activeList : incoming.activeList;
  const complete = validateLibraryBackup({ ...incoming, lists, preferences, groups, activeList });
  const writes = new Map([
    [KEYS.lists, JSON.stringify(Object.fromEntries(complete.lists.filter((x) => x.definition).map((x) => [x.id, x.definition])))],
    [KEYS.activeList, complete.activeList],
  ]);
  for (const entry of complete.lists) writes.set(entry.id === "builtin" ? KEYS.builtin : KEYS.list(entry.id), serializeEntry(entry, before.get(entry.id)?.progress));
  if (mode === "replace") for (const entry of local.lists) if (!complete.lists.some((x) => x.id === entry.id)) writes.set(KEYS.list(entry.id), null);
  for (const [key] of PREF_RULES) writes.set(key, complete.preferences[key] ?? null);
  for (const id of new Set([...local.lists.map((x) => x.id), ...complete.lists.map((x) => x.id)])) writes.set(KEYS.group(id), complete.groups[id] ? JSON.stringify(complete.groups[id]) : null);
  const summary = {
    mode, lists: complete.lists.length, newLists: complete.lists.filter((x) => !before.has(x.id)).length,
    removedLists: mode === "replace" ? local.lists.filter((x) => !complete.lists.some((y) => y.id === x.id)).length : 0,
    watchedBefore: local.lists.reduce((n, x) => n + x.progress.seen.length, 0),
    watchedAfter: complete.lists.reduce((n, x) => n + x.progress.seen.length, 0),
    settingsChanged: mode === "replace", warnings,
  };
  return { writes, summary };
}

export function previewLibraryRestore(storage, snapshot, mode = "merge", { store = null } = {}) {
  return planRestore(storage, snapshot, mode, store).summary;
}

/** Synchronous planned write with compensating rollback; no localStorage transaction exists. */
export function restoreLibrary(storage, snapshot, { mode = "merge", store = null } = {}) {
  const { writes, summary } = planRestore(storage, snapshot, mode, store);
  const before = new Map([...writes.keys()].map((key) => [key, storage.getItem(key)]));
  const apply = (entries) => {
    for (const [key, value] of entries) value == null ? storage.removeItem(key) : storage.setItem(key, value);
  };
  const restoreRaw = () => {
    // Free newly added keys first. Restoring a large original before removing new records can itself
    // exceed quota. Continue all compensating writes, then retry failures after space is available.
    const entries = [...before].sort(([ka, a], [kb, b]) => {
      const cost = (key, value) => value == null ? -Infinity : value.length - (storage.getItem(key)?.length || 0);
      return cost(ka, a) - cost(kb, b);
    });
    const failed = [];
    for (const entry of entries) {
      try { apply([entry]); } catch { failed.push(entry); }
    }
    for (const entry of failed) apply([entry]);
  };
  try { apply(writes); } catch (cause) {
    try { restoreRaw(); } catch (rollbackError) {
      const error = Error("The restore failed and browser storage could not complete its rollback. Keep both backup files before reloading.", { cause });
      error.rollbackError = rollbackError;
      error.before = Object.fromEntries(before);
      throw error;
    }
    throw Error("The library could not be saved. Your previous library has been restored.", { cause });
  }
  let rolledBack = false;
  return {
    summary,
    rollback() {
      if (rolledBack) return;
      if ([...writes].some(([key, value]) => storage.getItem(key) !== value)) throw Error("The library changed after the restore. Export a backup before undoing it.");
      restoreRaw();
      rolledBack = true;
      if (store) store.load();
    },
  };
}
