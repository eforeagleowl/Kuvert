// Prints a film's line for the film table (js/data/films.js), from Wikidata's statements (CC0):
//
//   node tools/film-facts.mjs "The Third Man" 1949     by English title and release year
//   node tools/film-facts.mjs Q271830                  by Wikidata item
//   node tools/film-facts.mjs Q271830 "The Third Man" 1949   the item, under the title and year Kuvert uses
//
// The rules are those of docs/EDITORIAL.md: a runtime is taken only when the statements that aren't
// deprecated (or the preferred ones) agree on one; otherwise the line comes without it and says so,
// and a named source goes in by hand as `via`. Needs network access to wikidata.org.
import { pathToFileURL } from "node:url";

// A plain client name: the tool says what it is, and nothing about who runs it.
const AGENT = { "User-Agent": "film-facts/1.0 (film list tool; a few requests at a time)" };
const API = "https://www.wikidata.org/w/api.php?format=json&";
const UNIT = { Q7727: 1, Q11574: 1 / 60, Q25235: 60 }; // minute, second, hour
export const slug = (s) => String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// One request at a time, a pause between them, and patience when the API asks for it.
let last = 0;
async function ask(query) {
  for (let attempt = 0; ; attempt++) {
    const wait = last + 1200 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();
    let text = "";
    try {
      text = await (await fetch(API + query, { headers: AGENT })).text();
      const json = JSON.parse(text);
      if (!json.error) return json;
      text = JSON.stringify(json.error);
    } catch (e) {
      text ||= String(e);
    }
    if (attempt >= 6) throw new Error("Wikidata didn't answer: " + text.slice(0, 120));
    await new Promise((r) => setTimeout(r, Math.min(60000, 4000 * 2 ** attempt)));
  }
}
const entities = async (ids, props) => (await ask(`action=wbgetentities&props=${props}&languages=en&ids=${ids.join("|")}`)).entities;
const value = (claim) => claim.mainsnak.datavalue?.value;
const live = (claims = []) => claims.filter((c) => c.rank !== "deprecated" && value(c));
const yearsOf = (e) => [...new Set(live(e.claims?.P577).map((c) => Number(value(c).time.slice(1, 5))))].sort();

/** The Wikidata item for a title and year: a film (it has an IMDb id) released within a year of it. */
export async function findFilm(title, year) {
  const found = (await ask(`action=wbsearchentities&type=item&language=en&limit=20&search=${encodeURIComponent(title)}`)).search.map((s) => s.id);
  if (!found.length) return [];
  const all = await entities(found, "claims|labels");
  return found.filter((q) => all[q].claims?.P345 && yearsOf(all[q]).some((y) => Math.abs(y - year) <= 1));
}

/** The table's fields for an item. `problems` says what a person has to settle. */
export async function filmFacts(item, { title = null, year = null, today = new Date().toISOString().slice(0, 10) } = {}) {
  const e = (await entities([item], "claims|labels"))[item];
  if (!e || e.missing !== undefined) throw new Error("No such Wikidata item: " + item);
  const claims = e.claims || {}, problems = [];
  const minutes = (c) => (UNIT[value(c).unit.split("/").pop()] ? Math.round(Number(value(c).amount) * UNIT[value(c).unit.split("/").pop()]) : null);
  const durations = live(claims.P2047).filter((c) => minutes(c));
  const pool = durations.some((c) => c.rank === "preferred") ? durations.filter((c) => c.rank === "preferred") : durations;
  const lengths = [...new Set(pool.map(minutes))];
  const refer = [...live(claims.P57), ...live(claims.P136)].map((c) => value(c).id);
  const names = refer.length ? await entities([...new Set(refer)], "labels") : {};
  const label = (c) => names[value(c).id]?.labels?.en?.value;
  const dir = live(claims.P57).map(label).filter(Boolean).join(", ");
  const g = [...new Set(live(claims.P136).map(label).filter(Boolean))];
  const t = title ?? e.labels?.en?.value, y = year ?? yearsOf(e)[0];
  if (!t || !y) throw new Error(`${item} has no English ${t ? "release year" : "title"} on Wikidata: pass the title and year Kuvert should use.`);
  if (lengths.length !== 1) problems.push(lengths.length ? `Wikidata's runtimes disagree (${lengths.join(", ")} min): take one from a named source, as \`via\`` : "Wikidata has no runtime: take one from a named source, as `via`");
  if (!dir) problems.push("Wikidata names no director: take one from a named source, as `via`");
  if (!g.length) problems.push("Wikidata lists no genre: pick `moods` by hand");
  const tmdb = value(live(claims.P4947)[0] || { mainsnak: {} });
  const ref = lengths.length === 1 ? [...new Set(pool.flatMap((c) => (c.references || []).flatMap((r) => (r.snaks?.P854 || []).map((s) => s.datavalue?.value).filter(Boolean))))] : [];
  const row = { t, y, wd: item, ...(tmdb ? { tmdb: Number(tmdb) } : {}), ...(lengths.length === 1 ? { rt: lengths[0] } : {}), ...(dir ? { dir } : {}), ...(g.length ? { g } : {}), at: today, ...(ref.length ? { ref } : {}) };
  return { id: `${y}-${slug(t)}`, row, problems, label: e.labels?.en?.value, years: yearsOf(e) };
}

export const tableLine = ({ id, row }) => `  ${JSON.stringify(id)}: ${JSON.stringify(row)},`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const item = /^Q\d+$/.test(args[0] || "") ? args.shift() : null;
  const [title, year] = [args[0] || null, args[1] ? Number(args[1]) : null];
  if (!item && !(title && year)) {
    console.error('Usage: node tools/film-facts.mjs "Title" 1999   or   node tools/film-facts.mjs Q12345 ["Title" 1999]');
    process.exit(2);
  }
  const items = item ? [item] : await findFilm(title, year);
  if (!items.length) console.error(`No film called "${title}" from about ${year} on Wikidata. Look it up there and pass its item (Q…).`);
  if (items.length > 1) console.error(`${items.length} films match: the first is shown; pass the item (Q…) to choose.`, items.join(" "));
  if (items.length) {
    try {
      const facts = await filmFacts(items[0], { title, year });
      console.log(tableLine(facts));
      if (title && slug(facts.label || "") !== slug(title)) console.error(`  Wikidata calls it "${facts.label}" (${facts.years.join(", ")}).`);
      for (const p of facts.problems) console.error("  ! " + p);
      console.error(`  The film also needs its premise line, under ${JSON.stringify(facts.id)} in js/data/premises-en.js and premises-sv.js (docs/EDITORIAL.md has the rules).`);
    } catch (e) {
      // Wikidata didn't answer, or the item has no English title or year to make an id from.
      console.error(e.message);
      process.exit(1);
    }
  }
  process.exitCode = items.length ? 0 : 1;
}
