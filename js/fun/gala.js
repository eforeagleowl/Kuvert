// Galan: an extra mode, like SEAGAL, switched on from the small "for the completists." link in About. Its
// list is every film ever nominated for Best Picture: all 98 ceremonies' complete ballots
// (js/data/ceremonies.js), winners and nominees, no honorable mentions. The regular list of 275 stays as it
// is. Both lists use the same film ids, so a film watched in one counts in the other (js/state/shared.js).
import { $ } from "../ui/dom.js";
import { KEYS } from "../compat/keys.js";
import { CEREMONIES } from "../data/ceremonies.js";
import { KUVERT } from "../data/catalogue.js";
import { listed } from "../data/films.js";
import { buildListDefinition, readCustomLists, writeCustomLists } from "../data/lists.js";

export const GALA_LIST_ID = "gala";
// Bump when the ballots change, so installed copies are rebuilt (ids stay, so progress stays).
const GALA_VERSION = 2; // 2: "Les Misérables" (2012) spelled right
export const GALA = {
  name: { en: "Galan", sv: "Galan" },
  subtitle: { en: "Every Best Picture nominee, all 98 ceremonies, drawn at random", sv: "Alla som nominerats till Bästa film, alla 98 galor, dragna på måfå" },
};

/**
 * The gala's films: every ballot in ceremony order, each film once. Ballots and the regular list name
 * their films by the same ids (js/data/films.js), so progress carries between the two and series still
 * play in order.
 */
export function galaFilms() {
  const seen = new Set(),
    films = [];
  for (const c of CEREMONIES)
    for (const f of c.films) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      films.push(listed(f.id, { s: f.s, c: c.number }));
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

/** The frame of the app in gala mode: the way out sits where the way in was. */
export function installGala(app) {
  document.documentElement.dataset.gala = "";
  $("galaLink").hidden = true;
  $("galaLeave").hidden = false;
}
