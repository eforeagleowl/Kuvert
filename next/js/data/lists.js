// Movie lists: the built-in Best Picture list and the ones you import. Each list keeps its own progress
// under its own storage key; the built-in list stays on kuvert:v4.
import { KUVERT, FILMS, PALETTES, SEAGAL_FILMS, SEAGAL_LIST_VERSION } from "./catalogue.js";
import { KEYS } from "../compat/keys.js";

export function slugify(s) {
  return String(s)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function readCustomLists(storage) {
  try {
    const all = JSON.parse(storage.getItem(KEYS.lists) || "{}");
    return all && typeof all === "object" && !Array.isArray(all) ? all : {};
  } catch {
    return {};
  }
}
export function writeCustomLists(storage, all) {
  storage.setItem(KEYS.lists, JSON.stringify(all));
}

// Turns loose rows ({title, year, shelf, series, part}) into a checked list definition.
export function buildListDefinition({ name, subtitle, palette, films, series = {}, shelves = null, id = null }) {
  if (!Array.isArray(films) || !films.length) throw Error("The list has no films.");
  if (films.length > 2000) throw Error("Lists can hold up to 2,000 films.");
  const shelfWord = (v) => {
    const w = String(v ?? "").trim().toLowerCase();
    if (!w) return "";
    if (["w", "won", "win", "winner"].includes(w)) return "W";
    if (["n", "nom", "nominee", "nominated", "nomination"].includes(w)) return "N";
    if (["h", "hm", "honorable", "honorable mention", "honourable mention", "mention"].includes(w)) return "H";
    throw Error("Unknown shelf “" + v + "”. Use W, N or H (or leave it blank).");
  };
  const seriesNames = { ...series },
    used = new Set(),
    clean = [];
  films.forEach((row, i) => {
    const t = String(row.t ?? row.title ?? row.name ?? row.film ?? "").trim();
    const y = Number(row.y ?? row.year);
    if (!t) throw Error("Row " + (i + 1) + " has no title.");
    if (!Number.isInteger(y) || y < 1870 || y > 2100) throw Error("“" + t + "” needs a four-digit year.");
    const f = { t: t.slice(0, 200), y, s: shelfWord(row.s ?? row.shelf) };
    if (row.kind === "album") f.kind = "album"; // not a film: no TMDB lookup
    const c = Number(row.c ?? row.ceremony);
    if (Number.isInteger(c) && c > 0 && c < 1000) f.c = c;
    const rawSeries = String(row.tri ?? row.series ?? "").trim();
    if (rawSeries) {
      const key = seriesNames[rawSeries] ? rawSeries : slugify(rawSeries).slice(0, 40) || "series";
      if (!seriesNames[key]) seriesNames[key] = rawSeries;
      const ord = Number(row.ord ?? row.part);
      if (!Number.isInteger(ord) || ord < 1) throw Error("“" + t + "” is in a series, so it needs a part number.");
      f.tri = key;
      f.ord = ord;
    }
    let fid = String(row.id || y + "-" + slugify(t)).slice(0, 120);
    for (let n = 2; used.has(fid); n++) fid = y + "-" + slugify(t) + "-" + n;
    used.add(fid);
    f.id = fid;
    clean.push(f);
  });
  const hasShelves = clean.some((f) => f.s);
  if (hasShelves) clean.forEach((f) => (f.s ||= "N"));
  const listId = id || "l" + Date.now().toString(36);
  return {
    id: listId,
    name: String(name || "My list").trim().slice(0, 40) || "My list",
    subtitle: String(subtitle || "Drawn at random").slice(0, 120),
    palette: PALETTES[palette] ? palette : "kuvert",
    shelves: hasShelves ? shelves || KUVERT.shelves : null,
    series: seriesNames,
    films: clean,
    catalogue: "custom:" + listId + ":" + clean.length,
  };
}

/**
 * Which list this page shows. The built-in list uses the original storage key.
 * @returns {{ custom: boolean, id: string, name: string, subtitle: string, palette: string, shelves: object|null,
 *   series: Record<string,string>, catalogue: string, olderCatalogues: string[], retired: string[],
 *   storageKey: string, definition: object|null, films: object[] }}
 */
export function resolveList(storage) {
  const builtIn = {
    custom: false,
    id: "builtin",
    name: KUVERT.name,
    subtitle: KUVERT.subtitle,
    palette: KUVERT.palette,
    shelves: KUVERT.shelves,
    series: KUVERT.series,
    catalogue: KUVERT.catalogue,
    olderCatalogues: KUVERT.olderCatalogues,
    retired: KUVERT.retired,
    storageKey: KUVERT.storageKey,
    definition: null,
    films: FILMS.map((f) => ({ ...f })),
  };
  let active = null;
  try {
    active = storage.getItem(KEYS.activeList);
  } catch {}
  const def = active && active !== "builtin" ? readCustomLists(storage)[active] : null;
  if (!def || !Array.isArray(def.films) || !def.films.length) return builtIn;
  return {
    custom: true,
    id: def.id,
    name: def.name,
    subtitle: def.subtitle,
    palette: def.palette,
    shelves: def.shelves,
    series: def.series || {},
    catalogue: def.catalogue,
    olderCatalogues: [],
    retired: [],
    storageKey: KEYS.list(def.id),
    definition: def,
    films: def.films.map((f) => ({ ...f })),
  };
}

// Installs a list that arrived inside a backup or sync file.
export function installListFromBackup(storage, def) {
  const clean = buildListDefinition({ ...def, id: def.id });
  clean.catalogue = def.catalogue || clean.catalogue;
  const lists = readCustomLists(storage);
  lists[clean.id] = clean;
  writeCustomLists(storage, lists);
  return clean;
}

// The list's own file format, for Export and for sharing a list.
export function exportableList(list) {
  const def = list.custom
    ? list.definition
    : { name: KUVERT.name, subtitle: KUVERT.subtitle, palette: KUVERT.palette, series: KUVERT.series, shelves: KUVERT.shelves, films: list.films };
  return {
    fileName: slugify(def.name + " " + def.films.length) + ".json",
    body: {
      name: def.name,
      subtitle: def.subtitle,
      palette: def.palette,
      series: def.series,
      shelves: def.shelves,
      films: def.films.map(({ t, y, s, tri, ord }) => ({ title: t, year: y, ...(s ? { shelf: s } : {}), ...(tri ? { series: tri, part: ord } : {}) })),
    },
  };
}

// SEAGAL mode's list: Steven Seagal's filmography, deployed at random.
export const SEAGAL_LIST_ID = "seagal";
export function installSeagalList(storage) {
  const lists = readCustomLists(storage);
  if (lists[SEAGAL_LIST_ID]?.version >= SEAGAL_LIST_VERSION) return;
  // Film ids come from title and year, so rebuilding keeps any progress.
  const def = buildListDefinition({
    id: SEAGAL_LIST_ID,
    name: "Seagal filmography",
    subtitle: "Every Steven Seagal film, deployed at random",
    palette: "natt",
    series: { "under-siege": "Under Siege" },
    films: SEAGAL_FILMS.map(([title, year, part, kind]) => ({
      title,
      year,
      ...(part ? { series: "under-siege", part } : {}),
      ...(kind ? { kind } : {}),
    })),
  });
  def.version = SEAGAL_LIST_VERSION;
  lists[def.id] = def;
  writeCustomLists(storage, lists);
}
