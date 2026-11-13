import { pathToFileURL } from "node:url";
import { FILMS, KUVERT, MOODS, PALETTES, BEST_PICTURE_FIELD } from "../js/data/catalogue.js";
import { CURATED_COLLECTIONS, CURATED_METADATA } from "../js/data/curated.js";
import { BASIC_METADATA } from "../js/data/basics.js";
import { CEREMONIES } from "../js/data/ceremonies.js";
import { FILM_TABLE } from "../js/data/films.js";
import { AWARD_LISTS } from "../js/data/award-lists.js";
import { AWARDS } from "../js/data/awards.js";
import { PREMISES as PREMISES_EN } from "../js/data/premises-en.js";
import { PREMISES as PREMISES_SV } from "../js/data/premises-sv.js";

const slug = (s) => String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const https = (url) => { try { return new URL(url).protocol === "https:"; } catch { return false; } };

export function validateCatalogue({ films = FILMS, collections = CURATED_COLLECTIONS, metadata = BASIC_METADATA, editorial = CURATED_METADATA, ceremonies = CEREMONIES, table = FILM_TABLE, awardLists = AWARD_LISTS, premises = { en: PREMISES_EN, sv: PREMISES_SV } } = {}) {
  const errors = [], fail = (condition, message) => { if (!condition) errors.push(message); };
  function checkFilms(rows, label) {
    const ids = new Set();
    for (const f of rows) {
      fail(typeof f.t === "string" && !!f.t.trim(), `${label}: missing title`);
      fail(Number.isInteger(f.y) && f.y >= 1870 && f.y <= 2100, `${label}: invalid year for ${f.id}`);
      fail(typeof f.id === "string" && f.id.length > 0 && f.id.length <= 120, `${label}: invalid ID`);
      fail(!ids.has(f.id), `${label}: duplicate ID ${f.id}`); ids.add(f.id);
      fail(["", "W", "N", "H"].includes(f.s || ""), `${label}: unknown shelf for ${f.id}`);
      if (f.c !== undefined) fail(Number.isInteger(f.c) && f.c >= 1 && f.c <= 999, `${label}: invalid ceremony for ${f.id}`);
      if (f.tri) fail(Number.isInteger(f.ord) && f.ord > 0, `${label}: invalid series part for ${f.id}`);
    }
  }
  checkFilms(films, "Built-in");
  for (const [key] of Object.entries(KUVERT.series)) {
    const parts = films.filter(f => f.tri === key).map(f => f.ord).sort((a, b) => a - b);
    fail(parts.length > 0 && parts.every((n, i) => n === i + 1), `Built-in: missing or repeated series part in ${key}`);
  }
  const collectionIds = new Set();
  for (const c of collections) {
    fail(!collectionIds.has(c.id), `Collections: duplicate ID ${c.id}`); collectionIds.add(c.id);
    fail(!!PALETTES[c.palette], `${c.id}: invalid palette`);
    fail(Array.isArray(c.films) && c.films.length > 0 && c.films.length <= 2000, `${c.id}: invalid size`);
    checkFilms(c.films || [], c.id);
    for (const f of c.films || []) {
      fail(f.id === `${f.y}-${slug(f.t)}`, `${c.id}: unstable film ID ${f.id}`);
      const m = editorial[f.id];
      fail(!!m, `${c.id}: missing editorial record ${f.id}`);
      if (!m) continue;
      for (const lang of ["en", "sv"]) {
        fail(typeof m.context?.[lang] === "string" && m.context[lang].length > 30, `${f.id}: missing ${lang} context`);
        fail(Array.isArray(m.questions?.[lang]) && m.questions[lang].length === 2 && m.questions[lang].every(q => typeof q === "string" && q.length > 10), `${f.id}: missing ${lang} discussion questions`);
        fail(typeof c.title?.[lang] === "string" && typeof c.introduction?.[lang] === "string", `${c.id}: missing ${lang} collection copy`);
      }
      fail(typeof m.director === "string" && !!m.director.trim(), `${f.id}: missing director`);
      fail(https(m.source), `${f.id}: missing source`);
    }
  }
  let runtimeCoverage = 0;
  for (const f of films) {
    const m = metadata[f.id];
    if (m?.runtime > 0) runtimeCoverage++;
    fail(Number.isFinite(m?.runtime) && m.runtime > 0 && m.runtime < 1500, `${f.id}: missing or invalid runtime`);
    fail(https(m?.source) && Array.isArray(m?.sources) && m.sources.some(s => https(s.url)), `${f.id}: missing metadata provenance`);
    fail(Array.isArray(m?.moods) && m.moods.length > 0 && m.moods.every(tag => MOODS.includes(tag)), `${f.id}: invalid mood suggestion`);
  }
  const numbers = new Set(), ballotIds = new Set();
  for (const c of ceremonies) {
    fail(!numbers.has(c.number), `Ceremonies: duplicate number ${c.number}`); numbers.add(c.number);
    fail(!ballotIds.has(c.id), `Ceremonies: duplicate ID ${c.id}`); ballotIds.add(c.id);
    fail(c.complete === true && c.films.length === BEST_PICTURE_FIELD[c.number - 1] && c.nomineeCount === c.films.length, `${c.id}: incomplete Best Picture field`);
    checkFilms(c.films, c.id);
    fail(c.films.every(f => f.c === c.number), `${c.id}: mismatched ceremony field`);
    const winners = c.films.filter(f => f.s === "W");
    fail(winners.length === 1 && winners[0]?.id === c.winnerId, `${c.id}: invalid winner`);
    const builtInWinner = films.find(f => f.s === "W" && f.c === c.number);
    if (builtInWinner) fail(builtInWinner.id === c.winnerId, `${c.id}: winner differs from built-in catalogue`);
    fail(https(c.source) && new URL(c.source).hostname.endsWith("oscars.org"), `${c.id}: missing authoritative Academy source`);
    fail(/^\d{4}-\d{2}-\d{2}$/.test(c.date) && Number.isFinite(Date.parse(c.date)), `${c.id}: invalid actual presentation date`);
    for (const f of c.films) {
      const existing = films.find(x => x.c === c.number && slug(x.t) === slug(f.t));
      if (existing) fail(existing.id === f.id, `${c.id}: changed existing permanent ID ${f.id}`);
    }
  }
  fail(numbers.size === 98 && Array.from({ length: 98 }, (_, i) => i + 1).every(n => numbers.has(n)), "Ceremonies: historical coverage must contain all 98 fields");
  // The built-in list's shelves say what the ballots say.
  for (const f of films.filter(f => f.s === "W" || f.s === "N")) {
    const ballot = ceremonies.find(c => c.number === f.c);
    fail(!!ballot && ballot.films.some(x => x.id === f.id) && (f.s === "W") === (ballot.winnerId === f.id), `Built-in: ${f.id} disagrees with the ballot of ceremony ${f.c}`);
  }
  const day = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "") && Number.isFinite(Date.parse(v));
  // Award lists: winners only, one or more at every ceremony from the first to the last, each named in the film table.
  const listIds = new Set([...collectionIds, "builtin", "gala", "seagal"]);
  for (const list of awardLists) {
    fail(/^[a-z]{1,20}$/.test(list.id || "") && !listIds.has(list.id), `Award lists: ${list.id} needs an id of its own`); listIds.add(list.id);
    fail(!!AWARDS[list.award] && !!PALETTES[list.palette], `${list.id}: unknown award or palette`);
    fail(typeof list.name === "string" && !!list.name && list.name.length <= 40, `${list.id}: needs a name of at most 40 characters`);
    for (const lang of ["en", "sv"]) fail(typeof list.title?.[lang] === "string" && typeof list.subtitle?.[lang] === "string", `${list.id}: missing ${lang} title or subtitle`);
    fail(https(list.source?.url) && day(list.source?.at), `${list.id}: missing source`);
    checkFilms(list.films || [], list.id);
    const numbers = new Set((list.films || []).map(f => f.c));
    fail(list.ceremonies === numbers.size && Array.from({ length: numbers.size }, (_, i) => i + 1).every(n => numbers.has(n)), `${list.id}: ceremonies must run from the 1st to the ${list.ceremonies}th, none missing`);
    fail(list.lastYear - list.firstYear + 1 === list.ceremonies, `${list.id}: its years and its ceremonies disagree`);
    for (const f of list.films || []) {
      fail(f.s === "W", `${list.id}: ${f.id} is not marked as a winner`);
      fail(!f.tri, `${list.id}: ${f.id} carries a series, which an award list leaves out`);
      const row = table[f.id];
      // A winner's own year is the year before the ceremony's, give or take one (premieres abroad, late releases).
      if (row) fail(Math.abs(row.y - (list.firstYear + f.c - 1)) <= 2, `${list.id}: ${f.id} is from ${row.y}, far from ceremony ${f.c}`);
    }
  }
  // The film table: every row sound, every film in some list, and every listed film with its facts.
  const listedIds = new Set([...films, ...collections.flatMap(c => c.films || []), ...ceremonies.flatMap(c => c.films), ...awardLists.flatMap(l => l.films || [])].map(f => f.id));
  const items = new Set(), tmdbIds = new Set();
  for (const [id, f] of Object.entries(table)) {
    fail(/^\d{4}-[a-z0-9-]+$/.test(id) && id.startsWith(f.y + "-") && typeof f.t === "string" && !!f.t.trim(), `Film table: ${id} needs a title, and the year its id starts with`);
    fail(listedIds.has(id), `Film table: ${id} is in no list`);
    fail(/^Q\d+$/.test(f.wd || "") && !items.has(f.wd), `Film table: ${id} needs a Wikidata item of its own`); items.add(f.wd);
    if (f.tmdb !== undefined) { fail(Number.isInteger(f.tmdb) && f.tmdb > 0 && !tmdbIds.has(f.tmdb), `Film table: ${id} has an invalid or repeated TMDB id`); tmdbIds.add(f.tmdb); }
    if (f.rt !== undefined) fail(Number.isInteger(f.rt) && f.rt > 0 && f.rt < 1500 && typeof f.dir === "string" && !!f.dir.trim() && (Array.isArray(f.g) ? f.g.length > 0 && day(f.at) : Array.isArray(f.moods) && !!f.via), `Film table: ${id} has incomplete facts`);
    if (f.via) fail(https(f.via.url) && typeof f.via.label === "string" && !!f.via.label && day(f.via.at), `Film table: ${id} has an incomplete named source`);
    if (f.moods) fail(f.moods.length > 0 && f.moods.every(tag => MOODS.includes(tag)), `Film table: ${id} has an unknown mood`);
    if (f.tri) fail(Number.isInteger(f.ord) && f.ord > 0, `Film table: ${id} has no part number in its series`);
  }
  // The premise lines: one for every film in the table, in both languages, and none left over.
  for (const lang of ["en", "sv"]) {
    for (const id of Object.keys(table)) {
      const line = premises[lang]?.[id];
      fail(typeof line === "string" && line.length >= 40 && line.length <= 160 && /[.?!]$/.test(line) && !/\s\s|^\s|\s$/.test(line), `Premises (${lang}): ${id} needs one line of 40 to 160 characters, ending in a full stop`);
    }
    for (const id of Object.keys(premises[lang] || {})) fail(!!table[id], `Premises (${lang}): ${id} is not in the film table`);
  }
  for (const id of Object.keys(table)) fail(premises.en?.[id] !== premises.sv?.[id], `Premises: ${id} reads the same in both languages`);
  for (const id of listedIds) {
    fail(!!table[id], `${id}: listed, but not in the film table`);
    const m = metadata[id];
    fail(Number.isFinite(m?.runtime) && m.runtime > 0 && https(m?.source) && Array.isArray(m?.moods) && m.moods.length > 0, `${id}: no runtime, source or mood`);
  }
  return { ok: !errors.length, errors, summary: { films: Object.keys(table).length, filmsWithFacts: [...listedIds].filter(id => metadata[id]?.runtime > 0).length, filmsWithPremise: Object.keys(table).filter(id => premises.en?.[id] && premises.sv?.[id]).length, awardLists: awardLists.length, awardListFilms: awardLists.reduce((n, l) => n + (l.films?.length || 0), 0), builtInFilms: films.length, collections: collections.length, curatedUniqueFilms: new Set(collections.flatMap(c => c.films.map(f => f.id))).size, runtimeCoverage, ceremonies: ceremonies.length, ballotEntries: ceremonies.reduce((n, c) => n + c.films.length, 0) } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = validateCatalogue();
  if (!result.ok) { console.error(result.errors.join("\n")); process.exitCode = 1; }
  else console.log(JSON.stringify(result.summary, null, 2));
}
