// The one place progress lives. Views read `store.p` and `store.settings`, and change them only through the
// actions below. Every action saves, stamps the films it touched (for sync), announces a "change" event,
// and returns the state from before it so the toast can offer Undo.
import { validateProgress, validateMoods, restorePosterPaths, validDate } from "../compat/validate.js";
import { stateData, browserSave, progressSignature } from "../compat/serialize.js";
import { encodeCode } from "../compat/codes.js";
import { KEYS } from "../compat/keys.js";
import { MOODS } from "../data/catalogue.js";
import { DEFAULT_SETTINGS, AVAILABILITY_TTL, DIRECTORY_TTL, validTime, finishDeadlineFor, getUnits, pickUnit, nextSeriesPart, moodsFor } from "./draw.js";
import { defaultWatchDate } from "./dates.js";
import { earnedIds, computeMilestones, ratingOf, watchedFilms } from "./stats.js";
import { emptyProgress, keepLocal, replace, bySync } from "./merge.js";

const FILTERS = ["unseen", "all", "skipped", "recent", "missing", "shelf"];
const WALL_SORTS = ["recent", "rank", "stars", "year"];

export class Store extends EventTarget {
  /**
   * @param {{ list: object, catalog: object, storage?: Storage|null, now?: () => Date }} o
   */
  constructor({ list, catalog, storage = null, now = () => new Date() }) {
    super();
    this.list = list;
    this.catalog = catalog;
    this.storage = storage;
    this.now = now;
    this.p = emptyProgress();
    this.settings = structuredClone(DEFAULT_SETTINGS);
    this.caches = { availability: {}, providerDirectories: {} };
    this.lastBackup = null;
    this.storageOK = false;
    this.writeLocked = false; // a save we couldn't read is never written over (see load)
    this.exclude = null; // group night: films someone in the group has seen (see state/group.js)
    this.unreadable = null;
    this.dirty = false;
    this.revision = 0;
    this.tmdbToken = null;
  }

  // ---------------------------------------------------------------- reading and writing
  get ctx() {
    return { ids: this.catalog.ids, catalogue: this.list.catalogue, custom: this.list.custom, definition: this.list.definition };
  }
  data() {
    return stateData(this.p, this.ctx);
  }
  code() {
    return encodeCode(this.data());
  }
  signature(data = this.data()) {
    return progressSignature(data);
  }

  /** Loads this list's browser save. Returns an error message when the save couldn't be read. */
  load() {
    const s = this.storage;
    if (!s) return null;
    try {
      s.setItem(KEYS.probe, "1");
      s.removeItem(KEYS.probe);
      this.storageOK = true;
    } catch {
      return null;
    }
    let raw = null,
      old = null;
    try {
      raw = s.getItem(this.list.storageKey);
      old = this.list.custom ? null : s.getItem(KEYS.oldBuiltin);
      if (raw || old) {
        const obj = JSON.parse(raw || old),
          d = validateProgress(obj, this.catalog.ctx, { browserLegacy: !raw });
        this.p = this.fromValidated(d, emptyProgress());
        this.p.current = d.current && this.catalog.byId.has(d.current) ? d.current : null;
        this.p.drawnOn = this.p.current ? d.drawnOn : null;
        this.p.saved = d.saved;
        const ps = obj.settings || {};
        this.loadSettings(ps, obj);
        this.p.moodSuggestions = validateMoods(obj.moodSuggestions || {}, this.catalog.ctx);
        for (const [id, n] of Object.entries(obj.runtimes || {}))
          if (this.catalog.ids.has(id) && Number.isFinite(n) && n > 0 && n < 1500) this.p.runtimes[id] = n;
        this.p.posterPaths = restorePosterPaths(obj.posterPaths, this.catalog.ctx);
        const backup = obj.lastBackup;
        if (backup && typeof backup.signature === "string" && Number.isFinite(Date.parse(backup.at))) this.lastBackup = backup;
        for (const [id, m] of Object.entries(obj.matches || {}))
          if (this.catalog.ids.has(id) && Number.isSafeInteger(m) && m > 0) this.p.matches[id] = m;
        if (!raw) this.persist();
      }
      this.tmdbToken = s.getItem(KEYS.tmdb) || null;
      return null;
    } catch {
      // Starting empty and saving would write over it. Keep it exactly as it was, with a spare copy
      // under its own key, and write nothing until you restore something or choose to start fresh.
      this.p = emptyProgress();
      const text = raw || old;
      if (text) {
        const key = raw ? this.list.storageKey : KEYS.oldBuiltin;
        this.writeLocked = true;
        this.unreadable = { key, text };
        try {
          if (!s.getItem(KEYS.unreadable(key))) s.setItem(KEYS.unreadable(key), text);
        } catch {}
      }
      try {
        this.tmdbToken = s.getItem(KEYS.tmdb) || null;
      } catch {}
      return "Saved progress could not be read. You can restore a backup in Settings.";
    }
  }
  /** Leaves an unreadable save behind (it stays under its spare key) and saves from now on. */
  startFresh() {
    this.writeLocked = false;
    this.unreadable = null;
    this.save("restore");
  }

  loadSettings(ps, obj) {
    const st = structuredClone(DEFAULT_SETTINGS),
      now = Date.now();
    st.moodFilter = typeof ps.moodFilter === "string" && ps.moodFilter && MOODS.includes(ps.moodFilter) ? ps.moodFilter : "";
    st.subscriptionOnly = !!ps.subscriptionOnly;
    // Keep a passed deadline expired rather than silently rolling it forward a day.
    if (validTime(ps.finishTime) && Number.isFinite(ps.finishDeadline)) {
      st.finishTime = ps.finishTime;
      st.finishDeadline = ps.finishDeadline;
    }
    st.selectedServices = {};
    for (const [region, ids] of Object.entries(ps.selectedServices || {}))
      if (/^[A-Z]{2}$/.test(region) && Array.isArray(ids)) st.selectedServices[region] = [...new Set(ids.filter((n) => Number.isSafeInteger(n) && n > 0))];
    const av = {};
    for (const [region, records] of Object.entries(obj.availability || {})) {
      if (!/^[A-Z]{2}$/.test(region) || !records || typeof records !== "object") continue;
      for (const [id, r] of Object.entries(records))
        if (this.catalog.ids.has(id) && r && Number.isFinite(r.at) && Array.isArray(r.ids) && now - r.at >= 0 && now - r.at < AVAILABILITY_TTL)
          (av[region] ??= {})[id] = { at: r.at, ids: [...new Set(r.ids.filter((n) => Number.isSafeInteger(n) && n > 0))] };
    }
    const dirs = {};
    for (const [region, d] of Object.entries(obj.providerDirectories || {}))
      if (/^[A-Z]{2}$/.test(region) && d && Number.isFinite(d.at) && Array.isArray(d.providers) && now - d.at >= 0 && now - d.at < DIRECTORY_TTL)
        dirs[region] = {
          at: d.at,
          providers: d.providers.filter((x) => Number.isSafeInteger(x.id) && x.id > 0 && typeof x.name === "string").map((x) => ({ id: x.id, name: x.name.slice(0, 150) })),
        };
    this.caches = { availability: av, providerDirectories: dirs };
    st.runtimeLimit = ps.runtimeLimit === -120 ? -120 : [90, 120].includes(ps.runtimeLimit) ? 120 : 0;
    st.timeMode = st.finishTime || ps.timeMode === "finish" ? "finish" : String(st.runtimeLimit);
    if (st.timeMode === "finish") st.runtimeLimit = 0;
    st.country = /^[A-Z]{2}$/.test(ps.country) ? ps.country : "US";
    st.drawSelection = !!ps.drawSelection;
    st.filter = FILTERS.includes(ps.filter) ? ps.filter : "unseen";
    st.wallSort = WALL_SORTS.includes(ps.wallSort) ? ps.wallSort : "recent";
    st.query = typeof ps.query === "string" ? ps.query : "";
    st.statusFilter = this.catalog.shelves[ps.statusFilter] ? ps.statusFilter : null;
    st.decadeFilter = Number.isInteger(ps.decadeFilter) ? ps.decadeFilter : null;
    this.settings = st;
  }

  /** A validated save in memory form. Fields an old code doesn't carry keep this device's values. */
  fromValidated(d, base = this.p) {
    const p = emptyProgress();
    p.seen = new Set(d.seen);
    p.dates = { ...d.dates };
    p.current = d.current || null;
    p.drawnOn = p.current ? d.drawnOn ?? null : null;
    p.skipped = new Set(d.skipped || []);
    p.reviews = structuredClone(d.reviews || {});
    p.recent = [...(d.recent || [])];
    p.moods = structuredClone(d.moods || {});
    p.runtimes = { ...(d.runtimes || {}) };
    p.rankings = d.rankings ? [...d.rankings] : [...base.rankings];
    p.verdicts = d.verdicts ? { ...d.verdicts } : { ...base.verdicts };
    p.lbx = d.lbx ? structuredClone(d.lbx) : structuredClone(base.lbx);
    p.matches = { ...(d.matches || {}) };
    p.shelf = d.shelf ? new Set(d.shelf) : new Set(base.shelf);
    p.snubs = d.snubs ? { ...d.snubs } : { ...base.snubs };
    p.posterPaths = { ...(d.posterPaths || {}) };
    p.moodSuggestions = structuredClone(d.moodSuggestions || {});
    p.saved = d.saved || null;
    p.stamps = { ...(d.stamps || {}) };
    for (const id of p.seen) p.skipped.delete(id);
    return p;
  }

  persist() {
    if (!this.storageOK || this.writeLocked) return false;
    try {
      this.storage.setItem(
        this.list.storageKey,
        JSON.stringify(browserSave(this.p, this.ctx, { settings: this.settings, lastBackup: this.lastBackup, ...this.caches })),
      );
      return true;
    } catch {
      this.storageOK = false;
      return false;
    }
  }

  /** Saves and tells everyone. `kind` says what changed, for views that care. */
  save(kind = "progress") {
    this.revision++;
    this.p.saved = this.now().toISOString();
    this.dirty = !this.persist();
    this.emit(kind, true);
  }
  // Settings and caches: saved, but not a change to your progress (no new revision for backups or sync).
  saveQuiet(kind = "settings") {
    this.persist();
    this.emit(kind);
  }
  // `saved`: progress changed (a new revision), so backups and sync should follow.
  emit(kind, saved = false) {
    this.dispatchEvent(new CustomEvent("change", { detail: { kind, saved } }));
  }

  touch(...keys) {
    const at = this.now().toISOString();
    for (const k of keys) if (k) this.p.stamps[k] = at;
  }

  // ---------------------------------------------------------------- undo
  snapshot() {
    const p = this.p;
    return {
      seen: [...p.seen],
      dates: { ...p.dates },
      current: p.current,
      skipped: [...p.skipped],
      reviews: structuredClone(p.reviews),
      recent: [...p.recent],
      moods: structuredClone(p.moods),
      runtimes: { ...p.runtimes },
      rankings: [...p.rankings],
      verdicts: { ...p.verdicts },
      lbx: structuredClone(p.lbx),
      shelf: [...p.shelf],
      snubs: { ...p.snubs },
      drawnOn: p.drawnOn,
      stamps: { ...p.stamps },
    };
  }
  undo(s) {
    const p = this.p;
    // Everything the snapshot touched is changing again now, so sync should prefer this.
    const changed = new Set([...p.seen, ...s.seen].filter((id) => p.seen.has(id) !== s.seen.includes(id)));
    p.seen = new Set(s.seen);
    p.dates = { ...s.dates };
    p.current = s.current && this.catalog.byId.has(s.current) ? s.current : null;
    p.drawnOn = p.current ? s.drawnOn ?? defaultWatchDate(this.now()) : null;
    p.skipped = new Set(s.skipped);
    p.reviews = structuredClone(s.reviews);
    p.recent = [...s.recent];
    p.moods = structuredClone(s.moods);
    p.runtimes = { ...s.runtimes, ...p.runtimes };
    p.rankings = [...s.rankings];
    p.verdicts = { ...s.verdicts };
    p.lbx = structuredClone(s.lbx);
    p.shelf = new Set(s.shelf);
    p.snubs = { ...s.snubs };
    p.stamps = { ...s.stamps };
    for (const id of p.seen) p.skipped.delete(id);
    this.touch(...changed, "$current", "$ranking");
    this.save("undo");
  }

  // ---------------------------------------------------------------- the draw
  env() {
    return { p: this.p, settings: this.settings, caches: this.caches, catalog: this.catalog, now: this.now(), exclude: this.exclude };
  }
  units(opts) {
    return getUnits(this.env(), opts);
  }
  get currentFilm() {
    return this.p.current ? this.catalog.byId.get(this.p.current) || null : null;
  }
  recordPick(id) {
    this.p.recent = [id, ...this.p.recent.filter((x) => x !== id)].slice(0, 5);
  }
  /** Draws a film. Returns { film } or { reason: "none" | "only" }. */
  draw(random = Math.random) {
    const unit = pickUnit(this.units(), this.p.current, random);
    if (!unit) return { reason: "none" };
    if (unit.film.id === this.p.current) return { reason: "only" };
    const undo = this.snapshot();
    this.p.current = unit.film.id;
    this.p.drawnOn = defaultWatchDate(this.now());
    this.recordPick(unit.film.id);
    this.touch("$current");
    this.save("draw");
    return { film: unit.film, undo };
  }
  // Opening a film from a list puts it on tonight's ticket (unless it's watched: that shows its stub).
  pick(id) {
    if (!this.catalog.byId.has(id) || this.p.seen.has(id)) return;
    this.p.current = id;
    this.p.drawnOn = defaultWatchDate(this.now());
    this.recordPick(id);
    this.touch("$current");
    this.save("draw");
  }
  putBack() {
    if (!this.p.current) return null;
    const undo = this.snapshot();
    this.p.current = null;
    this.p.drawnOn = null;
    this.touch("$current");
    this.save("ticket");
    return undo;
  }
  keepTicket() {
    if (!this.p.current) return;
    this.p.drawnOn = defaultWatchDate(this.now());
    this.touch("$current");
    this.save("ticket");
  }
  /** Sets tonight's film aside. Only one at a time. */
  skipCurrent() {
    const id = this.p.current;
    if (!id || this.p.seen.has(id) || this.p.skipped.has(id)) return { reason: "none" };
    if (this.p.skipped.size) return { reason: "busy" };
    const undo = this.snapshot();
    this.p.skipped.add(id);
    this.p.current = null;
    this.touch(id, "$current");
    this.save("progress");
    return { undo, film: this.catalog.byId.get(id) };
  }

  // ---------------------------------------------------------------- watching
  /** Marks a film watched or not. A series stays on the ticket: its next part becomes tonight's film. */
  markSeen(id, on) {
    const f = this.catalog.byId.get(id);
    if (!f) return null;
    const undo = this.snapshot(),
      before = earnedIds(this.p, this.catalog),
      p = this.p;
    if (on) {
      p.seen.add(id);
      p.skipped.delete(id);
      p.dates[id] ??= defaultWatchDate(this.now());
    } else {
      p.seen.delete(id);
      delete p.dates[id];
    }
    const wasCurrent = p.current === id;
    const next = on && wasCurrent ? nextSeriesPart(p, this.catalog, f) : null;
    if (on && wasCurrent) {
      p.current = next ? next.id : null;
      p.drawnOn = next ? defaultWatchDate(this.now()) : null;
    }
    if (next) this.recordPick(next.id);
    this.touch(id, wasCurrent && "$current");
    this.save("progress");
    const earned = on ? computeMilestones(p, this.catalog).filter((c) => c.complete && !before.has(c.id)) : [];
    return { undo, film: f, next, earned, wasCurrent };
  }
  setDate(id, iso) {
    if (!this.p.seen.has(id) || (iso !== null && !validDate(iso))) return null;
    const undo = this.snapshot();
    if (iso === null) delete this.p.dates[id];
    else this.p.dates[id] = iso;
    this.touch(id);
    this.save("progress");
    return undo;
  }
  rate(id, rating) {
    const note = this.p.reviews[id]?.note || "",
      was = ratingOf(this.p, id);
    if (rating || note) this.p.reviews[id] = { note, rating: rating || null };
    else delete this.p.reviews[id];
    this.touch(id);
    this.save("rating");
    return was;
  }
  /** The note dialog: note, stars, and for winners the verdict and "should have won". */
  saveReview(id, { note, rating, verdict, snub }) {
    const undo = this.snapshot();
    note = String(note || "").trim().slice(0, 500);
    if (note || rating) this.p.reviews[id] = { note, rating: rating ?? null };
    else delete this.p.reviews[id];
    if (verdict !== undefined) {
      if (verdict) this.p.verdicts[id] = verdict;
      else delete this.p.verdicts[id];
      if (verdict === "no" && snub) this.p.snubs[id] = snub;
      else if (verdict !== "no") delete this.p.snubs[id];
    }
    this.touch(id);
    this.save("progress");
    return undo;
  }
  setVerdict(id, value) {
    const undo = this.snapshot();
    if (this.p.verdicts[id] === value) delete this.p.verdicts[id];
    else this.p.verdicts[id] = value;
    if (this.p.verdicts[id] !== "no") delete this.p.snubs[id];
    this.touch(id);
    this.save("progress");
    return undo;
  }
  setSnub(id, value) {
    if (value) this.p.snubs[id] = value;
    else delete this.p.snubs[id];
    this.touch(id);
    this.save("progress");
  }
  toggleShelf(id) {
    const undo = this.snapshot();
    if (this.p.shelf.has(id)) this.p.shelf.delete(id);
    else this.p.shelf.add(id);
    this.touch(id);
    this.save("progress");
    return undo;
  }
  setMoods(id, tags) {
    const undo = this.snapshot();
    this.p.moods[id] = [...tags];
    this.touch(id);
    this.save("progress");
    return undo;
  }
  moodsFor(id) {
    return moodsFor(this.p, id);
  }

  // ---------------------------------------------------------------- ranking ("Min topplista")
  // New films go after everything rated the same or higher, so the list starts in a sensible place.
  placeInRanking(id) {
    const undo = this.snapshot();
    const r = ratingOf(this.p, id);
    const list = this.p.rankings.filter((x) => this.p.seen.has(x) && x !== id);
    let at = list.length;
    if (r !== null) {
      at = 0;
      list.forEach((x, i) => {
        const rx = ratingOf(this.p, x);
        if (rx === null || rx >= r) at = i + 1;
      });
    }
    list.splice(at, 0, id);
    this.p.rankings = list;
    this.touch("$ranking");
    this.save("ranking");
    return undo;
  }
  removeFromRanking(id) {
    const undo = this.snapshot();
    this.p.rankings = this.p.rankings.filter((x) => x !== id);
    this.touch("$ranking");
    this.save("ranking");
    return undo;
  }
  moveRank(id, delta) {
    const list = this.p.rankings.filter((x) => this.p.seen.has(x));
    const i = list.indexOf(id),
      j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return null;
    list.splice(i, 1);
    list.splice(j, 0, id);
    this.p.rankings = list;
    this.touch("$ranking");
    this.save("ranking");
    return j;
  }
  setRanking(order) {
    const undo = this.snapshot();
    this.p.rankings = order.filter((id) => this.p.seen.has(id));
    this.touch("$ranking");
    this.save("ranking");
    return undo;
  }
  rankByStars() {
    const undo = this.snapshot();
    const films = watchedFilms(this.p, this.catalog).filter((f) => ratingOf(this.p, f.id) !== null);
    films.sort((a, b) => ratingOf(this.p, b.id) - ratingOf(this.p, a.id) || (this.p.dates[a.id] || "").localeCompare(this.p.dates[b.id] || ""));
    this.p.rankings = films.map((f) => f.id);
    this.touch("$ranking");
    this.save("ranking");
    return undo;
  }

  // ---------------------------------------------------------------- whole-progress changes
  reset() {
    const undo = this.snapshot();
    const keep = this.p;
    const fresh = emptyProgress();
    // Film details stay: they describe the films, not your progress.
    for (const k of ["runtimes", "matches", "posterPaths", "moodSuggestions"]) fresh[k] = keep[k];
    this.p = fresh;
    this.touch(...this.catalog.ids, "$current", "$ranking");
    this.save("restore");
    return undo;
  }
  /** Restore from a backup or code: "merge" keeps this device's choices, "replace" uses the backup's. */
  restore(d, mode) {
    const undo = this.snapshot();
    this.writeLocked = false; // what you restored replaces the save we couldn't read
    this.unreadable = null;
    const other = this.fromValidated(d, this.p);
    const before = this.p;
    this.p = mode === "merge" ? keepLocal(before, other) : replace(before, other);
    // The restored choices are the newest for sync, film by film.
    const changed = this.catalog.films.map((f) => f.id).filter((id) => filmKey(before, id) !== filmKey(this.p, id));
    this.touch(...changed, "$current", "$ranking");
    this.save("restore");
    return undo;
  }
  /** Sync: take the other device's copy, or merge film by film. */
  applyRemote(d, mode) {
    const undo = this.snapshot();
    const other = this.fromValidated(d, this.p);
    this.p = mode === "merge" ? bySync(this.p, other) : replace(this.p, other);
    this.save("sync");
    return undo;
  }
  /** Letterboxd import: the options ticked in the preview. */
  applyLetterboxd(changes) {
    const undo = this.snapshot();
    let n = 0;
    for (const [id, rating] of changes.ratings || []) {
      this.p.reviews[id] = { note: this.p.reviews[id]?.note || "", rating };
      this.touch(id);
      n++;
    }
    for (const [id, date] of changes.dates || []) {
      this.p.dates[id] = date;
      this.touch(id);
      n++;
    }
    for (const [id, e] of changes.prefill || []) {
      this.p.lbx[id] = { rating: e.rating, date: e.date };
      this.touch(id);
      n++;
    }
    this.save("progress");
    return { undo, n };
  }

  // ---------------------------------------------------------------- film details from TMDB
  setMatch(id, tmdbId, { forget = false } = {}) {
    this.p.matches[id] = tmdbId;
    if (forget) {
      delete this.p.runtimes[id];
      delete this.p.posterPaths[id];
      delete this.p.moodSuggestions[id];
      for (const region of Object.values(this.caches.availability)) delete region[id];
    }
    this.persist();
  }
  /** A film's poster: the one your own TMDB lookup found, or else the list's own (js/data/posters.js). */
  posterPath(id) {
    const own = this.p.posterPaths[id];
    return own || this.catalog.poster?.(id) || own;
  }
  recordDetails(id, { tmdbId, runtime, posterPath, moods, availability, region }) {
    if (tmdbId) this.p.matches[id] = tmdbId;
    if (moods) this.p.moodSuggestions[id] = moods;
    if (Number.isFinite(runtime) && runtime > 0) this.p.runtimes[id] = runtime;
    if (posterPath !== undefined) this.p.posterPaths[id] = posterPath;
    if (availability) (this.caches.availability[region] ??= {})[id] = availability;
    this.persist();
  }
  setProviderDirectory(region, providers) {
    this.caches.providerDirectories[region] = { at: Date.now(), providers };
    this.persist();
  }

  // ---------------------------------------------------------------- settings
  set(changes, kind = "settings") {
    Object.assign(this.settings, changes);
    this.saveQuiet(kind);
  }
  setFinishTime(value) {
    const finishTime = validTime(value) ? value : "";
    this.set({ finishTime, finishDeadline: finishTime ? finishDeadlineFor(finishTime, this.now()) : null, timeMode: finishTime ? "finish" : "0", runtimeLimit: 0 });
  }
  setTimeMode(value) {
    if (!["0", "120", "-120", "finish"].includes(value)) value = "0";
    const changes = { timeMode: value, runtimeLimit: value === "finish" ? 0 : Number(value) };
    if (value !== "finish") Object.assign(changes, { finishTime: "", finishDeadline: null });
    this.set(changes);
  }
  clearDrawFilters() {
    this.set({ finishTime: "", finishDeadline: null, timeMode: "0", runtimeLimit: 0, moodFilter: "", subscriptionOnly: false, drawSelection: false, statusFilter: null, decadeFilter: null, query: "" });
  }
  removePreference(kind) {
    const s = {};
    if (kind === "time") Object.assign(s, { runtimeLimit: 0, timeMode: "0", finishTime: "", finishDeadline: null });
    if (kind === "mood") s.moodFilter = "";
    if (kind === "services") s.subscriptionOnly = false;
    if (kind === "decade") s.decadeFilter = null;
    if (kind === "award") s.statusFilter = null;
    if (kind === "search") s.query = "";
    this.set(s);
  }

  recordBackup(data, kind = "file") {
    this.lastBackup = { at: this.now().toISOString(), signature: progressSignature(data), kind };
    this.persist();
    this.emit("backup");
  }
  setTmdbToken(token) {
    this.tmdbToken = token || null;
    try {
      if (token) this.storage?.setItem(KEYS.tmdb, token);
      else this.storage?.removeItem(KEYS.tmdb);
    } catch {}
  }
}

// Everything personal about one film, as text, to tell whether a restore changed it.
function filmKey(p, id) {
  return JSON.stringify([p.seen.has(id), p.dates[id], p.skipped.has(id), p.reviews[id], p.verdicts[id], p.snubs[id], p.shelf.has(id), p.moods[id], p.lbx[id]]);
}
