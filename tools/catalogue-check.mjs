import { pathToFileURL } from "node:url";
import { FILMS, KUVERT, MOODS, PALETTES, BEST_PICTURE_FIELD } from "../js/data/catalogue.js";
import { CURATED_COLLECTIONS, CURATED_METADATA } from "../js/data/curated.js";
import { BASIC_METADATA } from "../js/data/basics.js";
import { CEREMONIES } from "../js/data/ceremonies.js";

const slug = (s) => String(s).normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const https = (url) => { try { return new URL(url).protocol === "https:"; } catch { return false; } };

export function validateCatalogue({ films = FILMS, collections = CURATED_COLLECTIONS, metadata = BASIC_METADATA, editorial = CURATED_METADATA, ceremonies = CEREMONIES } = {}) {
  const errors = [], fail = (condition, message) => { if (!condition) errors.push(message); };
  function checkFilms(rows, label) {
    const ids = new Set();
    for (const f of rows) {
      fail(typeof f.t === "string" && !!f.t.trim(), `${label}: missing title`);
      fail(Number.isInteger(f.y) && f.y >= 1870 && f.y <= 2100, `${label}: invalid year for ${f.id}`);
      fail(typeof f.id === "string" && f.id.length > 0 && f.id.length <= 120, `${label}: invalid ID`);
      fail(!ids.has(f.id), `${label}: duplicate ID ${f.id}`); ids.add(f.id);
      fail(["", "W", "N", "H"].includes(f.s || ""), `${label}: unknown shelf for ${f.id}`);
      if (f.c !== undefined) fail(Number.isInteger(f.c) && f.c >= 1 && f.c <= 98, `${label}: invalid ceremony for ${f.id}`);
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
  return { ok: !errors.length, errors, summary: { builtInFilms: films.length, collections: collections.length, curatedUniqueFilms: new Set(collections.flatMap(c => c.films.map(f => f.id))).size, runtimeCoverage, ceremonies: ceremonies.length, ballotEntries: ceremonies.reduce((n, c) => n + c.films.length, 0) } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = validateCatalogue();
  if (!result.ok) { console.error(result.errors.join("\n")); process.exitCode = 1; }
  else console.log(JSON.stringify(result.summary, null, 2));
}
