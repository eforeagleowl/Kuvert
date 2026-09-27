// Every name Kuvert has ever written outside its own memory. The original app and this one share them,
// so both can run on the same site and read each other's saves. Never rename one.

export const KEYS = Object.freeze({
  builtin: "kuvert:v4", // progress, settings and caches for the built-in list
  list: (id) => "kuvert:list:" + id, // the same for an imported list
  oldBuiltin: "envelope:v1", // the first app's browser save; read once and moved to kuvert:v4
  tmdb: "envelope:tmdb", // TMDB credential. Never goes into backups, codes or the gist
  lists: "kuvert:lists", // imported list definitions
  activeList: "kuvert:activeList", // "builtin" or an imported list's id
  sync: "kuvert:sync", // { token, gistId, last: { [file]: { at, signature, remote } } }
  sounds: "kuvert:sounds", // "on" | "off"
  welcomed: "kuvert:welcomed", // "1" once the welcome card is dismissed
  mode: "kuvert:mode", // "seagal" while SEAGAL mode is on
  seagal: (k) => "kuvert:seagal:" + k, // SEAGAL's own records (cowardice, marks, hardToKill)
  probe: "kuvert:probe", // written and removed to test that storage works
  // Only this app writes these; the original app never reads them.
  safekeeping: "kuvert:safekeeping", // { count, snoozed }: films at your last copy, reminder snoozed until
  unreadable: (key) => "kuvert:unreadable:" + key, // a save that couldn't be read, kept exactly as it was
  // sessionStorage
  clearance: "kuvert:clearance", // show the SEAGAL boot screen once
  pendingRestore: "kuvert:pendingRestore", // a backup to preview after switching lists
});

// IndexedDB: the file handle behind "Back up progress", so the app can keep that file up to date.
export const IDB = Object.freeze({ name: "kuvert", version: 1, store: "handles", key: "handle" });

// GitHub Gist sync: one secret gist, marked by a note file, with one progress file per list.
export const GIST = Object.freeze({
  note: "kuvert-sync.txt",
  noteText: "Progress for Kuvert, kept in step between your devices. Managed by the app.",
  description: "Kuvert sync",
  file: (listId) => "kuvert-" + listId + ".json",
});

export const BACKUP_FILE = "kuvert-progress.json";
