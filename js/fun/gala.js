// Galan: an extra mode, like SEAGAL, switched on from the small "for the completists." link in About. Its
// list is every film ever nominated for Best Picture: all 98 ceremonies' complete ballots
// (js/data/ceremonies.js), winners and nominees, no honorable mentions. The regular list of 275 stays as it
// is. Both lists use the same film ids, so a film watched in one counts in the other (carryWatched).
import { $ } from "../ui/dom.js";
import { KEYS } from "../compat/keys.js";
import { t, plural } from "../i18n/index.js";
import { listContext, validateProgress } from "../compat/validate.js";
import { CEREMONIES } from "../data/ceremonies.js";
import { KUVERT, FILMS } from "../data/catalogue.js";
import { buildListDefinition, readCustomLists, writeCustomLists } from "../data/lists.js";

export const GALA_LIST_ID = "gala";
// Bump when the ballots change, so installed copies are rebuilt (ids stay, so progress stays).
const GALA_VERSION = 2; // 2: "Les Misérables" (2012) spelled right
export const GALA = {
  name: { en: "Galan", sv: "Galan" },
  subtitle: { en: "Every Best Picture nominee, all 98 ceremonies, drawn at random", sv: "Alla som nominerats till Bästa film, alla 98 galor, dragna på måfå" },
};

// A few ballots spell a title the Academy's way ("Sunset Blvd.", "Good Fellas", Dr. Strangelove's full title)
// where the regular list uses the familiar one. Same ceremony, same film: these keys pair them up.
const titleKey = (t) => String(t).toLowerCase().replace(/\bblvd\b/g, "boulevard").replace(/[^a-z0-9]/g, "");
const sameTitle = (a, b) => {
  const x = titleKey(a),
    y = titleKey(b);
  return x === y || (Math.min(x.length, y.length) >= 6 && (x.startsWith(y) || y.startsWith(x)));
};

/**
 * The gala's films: every ballot in ceremony order, each film once. A film on the regular list keeps its id,
 * title and series there, so progress carries between the two and series still play in order.
 */
export function galaFilms() {
  const regular = new Map(FILMS.map((f) => [f.id, f]));
  const seen = new Set(),
    films = [];
  for (const c of CEREMONIES)
    for (const f of c.films) {
      const r = regular.get(f.id) || FILMS.find((x) => x.c === (f.c ?? c.number) && x.s !== "H" && sameTitle(x.t, f.t));
      const id = r?.id || f.id;
      if (seen.has(id)) continue;
      seen.add(id);
      films.push({ id, t: r?.t || f.t, y: r?.y || f.y, s: f.s === "W" ? "W" : "N", c: f.c ?? c.number, ...(r?.tri ? { tri: r.tri, ord: r.ord } : {}) });
    }
  return films;
}

export function installGalaList(storage) {
  const lists = readCustomLists(storage);
  if (lists[GALA_LIST_ID]?.version >= GALA_VERSION) return lists[GALA_LIST_ID];
  const def = buildListDefinition({
    id: GALA_LIST_ID,
    name: GALA.name.en,
    subtitle: GALA.subtitle.en,
    palette: "gala",
    series: KUVERT.series,
    shelves: KUVERT.shelves,
    films: galaFilms(),
  });
  def.version = GALA_VERSION;
  lists[def.id] = def;
  writeCustomLists(storage, lists);
  return def;
}

export function enterGala(storage) {
  try {
    installGalaList(storage);
    storage.setItem(KEYS.activeList, GALA_LIST_ID);
  } catch {}
  location.hash = "tonight";
  location.reload();
}
export function leaveGala(storage) {
  try {
    storage.setItem(KEYS.activeList, "builtin");
  } catch {}
  location.hash = "tonight";
  location.reload();
}

// The other list's save, read the way its own page would read it.
function otherSave(storage, listId) {
  if (listId === GALA_LIST_ID)
    return { name: KUVERT.name, key: KUVERT.storageKey, ctx: listContext({ films: FILMS, catalogue: KUVERT.catalogue, olderCatalogues: KUVERT.olderCatalogues, retired: KUVERT.retired }) };
  const def = listId === "builtin" ? readCustomLists(storage)[GALA_LIST_ID] : null;
  if (!def?.films?.length) return null;
  return { name: GALA.name.en, key: KEYS.list(GALA_LIST_ID), ctx: listContext({ films: def.films, catalogue: def.catalogue, custom: true }) };
}

/** Brings over films watched in the other list (regular ↔ gala) that this list has no record of. */
export function carryWatched(app) {
  const { storage, store, list } = app;
  if (!storage || (list.id !== GALA_LIST_ID && list.id !== "builtin")) return 0;
  try {
    const other = otherSave(storage, list.id);
    const raw = other && storage.getItem(other.key);
    if (!raw) return 0;
    const n = store.carryWatched(validateProgress(JSON.parse(raw), other.ctx));
    if (n) app.toast.show(t("{films} came along from {list}.", { films: plural(n, "film"), list: other.name }));
    return n;
  } catch {
    return 0; // the other list's save is unreadable: its own page deals with that
  }
}

/** The frame of the app in gala mode: the way out sits where the way in was. */
export function installGala(app) {
  document.documentElement.dataset.gala = "";
  $("galaLink").hidden = true;
  $("galaLeave").hidden = false;
}
