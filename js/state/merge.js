// Combining two copies of your progress.
//
// keepLocal: the restore dialog's "Merge" (and sync without stamps): watched marks and shelves combine,
//   and wherever both copies say something, this device's copy wins. Same as the original app.
// bySync:    sync when both devices changed. Film by film, the copy that changed that film most recently
//   wins, so un-marking a film or taking it off the shelf on one device sticks. Films neither copy has
//   a change time for (saves from the original app) fall back to keepLocal.
// replace:   the restore dialog's "Replace" and sync when only the other device changed.
//
// Film details (runtimes, TMDB matches, posters, mood hints) always combine, this device first:
// they describe the film, not your progress.

const FILM_FIELDS = ["reviews", "verdicts", "snubs", "moods", "lbx", "dates"];

export function emptyProgress() {
  return {
    seen: new Set(),
    dates: {},
    current: null,
    drawnOn: null,
    skipped: new Set(),
    reviews: {},
    recent: [],
    moods: {},
    runtimes: {},
    rankings: [],
    verdicts: {},
    lbx: {},
    matches: {},
    shelf: new Set(),
    snubs: {},
    posterPaths: {},
    moodSuggestions: {},
    saved: null,
    stamps: {},
  };
}

export function cloneProgress(p) {
  return {
    ...structuredClone({ ...p, seen: null, skipped: null, shelf: null }),
    seen: new Set(p.seen),
    skipped: new Set(p.skipped),
    shelf: new Set(p.shelf),
  };
}

function details(local, other) {
  return {
    runtimes: { ...other.runtimes, ...local.runtimes },
    matches: { ...other.matches, ...local.matches },
    posterPaths: { ...other.posterPaths, ...local.posterPaths },
    moodSuggestions: { ...other.moodSuggestions, ...local.moodSuggestions },
  };
}

function finish(p) {
  for (const id of p.seen) p.skipped.delete(id);
  if (p.current && p.seen.has(p.current)) p.current = null;
  if (!p.current) p.drawnOn = null;
  return p;
}

export function keepLocal(local, other) {
  const out = cloneProgress(local);
  for (const id of other.seen) out.seen.add(id);
  out.dates = { ...other.dates, ...local.dates };
  if (!local.current) {
    out.current = other.current || null;
    out.drawnOn = out.current ? other.drawnOn : null;
  }
  out.skipped = new Set([...local.skipped, ...other.skipped]);
  out.reviews = { ...structuredClone(other.reviews), ...structuredClone(local.reviews) };
  out.recent = [...new Set([...local.recent, ...other.recent])].slice(0, 5);
  out.moods = { ...structuredClone(other.moods), ...structuredClone(local.moods) };
  out.rankings = [...local.rankings, ...other.rankings.filter((id) => !local.rankings.includes(id))];
  out.verdicts = { ...other.verdicts, ...local.verdicts };
  out.lbx = { ...structuredClone(other.lbx), ...structuredClone(local.lbx) };
  out.shelf = new Set([...local.shelf, ...other.shelf]);
  out.snubs = { ...other.snubs, ...local.snubs };
  Object.assign(out, details(local, other));
  out.stamps = newestStamps(local.stamps, other.stamps);
  return finish(out);
}

export function replace(local, other) {
  const out = cloneProgress(other);
  Object.assign(out, details(local, other));
  return finish(out);
}

const time = (s) => (s ? Date.parse(s) || 0 : 0);
function newestStamps(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) if (!out[k] || time(v) > time(out[k])) out[k] = v;
  return out;
}

// Millisecond clocks can tie across tabs/devices. The same tie must choose the same copy on both
// sides, otherwise each side keeps its own value forever. A deterministic record comparison breaks
// the tie; callers can surface a conflict when two equally stamped records differ.
function filmRecord(p, id) {
  return JSON.stringify([p.seen.has(id), p.skipped.has(id), p.shelf.has(id), ...FILM_FIELDS.map((field) => p[field][id] ?? null)]);
}
function stampedWinner(local, remote, key, record) {
  const lt = time(local.stamps?.[key]), rt = time(remote.stamps?.[key]);
  if (lt !== rt) return lt > rt ? local : remote;
  // Use code-unit ordering so the tie does not depend on the device's language or ICU version.
  return record(local) >= record(remote) ? local : remote;
}

function copyFilm(out, from, id) {
  from.seen.has(id) ? out.seen.add(id) : out.seen.delete(id);
  from.skipped.has(id) ? out.skipped.add(id) : out.skipped.delete(id);
  from.shelf.has(id) ? out.shelf.add(id) : out.shelf.delete(id);
  for (const field of FILM_FIELDS) {
    if (Object.hasOwn(from[field], id)) out[field][id] = structuredClone(from[field][id]);
    else delete out[field][id];
  }
}

export function bySync(local, remote) {
  const out = keepLocal(local, remote); // the fallback for films without change times
  const ls = local.stamps || {},
    rs = remote.stamps || {};
  for (const id of new Set([...Object.keys(ls), ...Object.keys(rs)])) {
    if (id.startsWith("$")) continue;
    const winner = stampedWinner(local, remote, id, (p) => filmRecord(p, id));
    copyFilm(out, winner, id);
  }
  // Tonight's ticket and the ranking are single choices: the newest one wins.
  if (ls.$current || rs.$current) {
    const w = stampedWinner(local, remote, "$current", (p) => JSON.stringify([p.current, p.drawnOn]));
    out.current = w.current || null;
    out.drawnOn = out.current ? w.drawnOn : null;
  }
  if (ls.$ranking || rs.$ranking) out.rankings = [...stampedWinner(local, remote, "$ranking", (p) => JSON.stringify(p.rankings)).rankings];
  out.stamps = newestStamps(ls, rs);
  return finish(out);
}
