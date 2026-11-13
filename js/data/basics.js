// Source-linked film facts as the app reads them: runtime, director, genres, suggested moods and where
// each came from. The facts themselves are in the film table (js/data/films.js); this turns a row into
// the record the ticket, the filters and the checks use. An envelope's own note on a film leads.
import { CURATED_METADATA } from './curated.js';
import { FILMS } from './catalogue.js';
import { FILM_TABLE, wikidataUrl } from './films.js';

const NOTES = {
  standard: {en:'Source-listed duration; restored, extended and regional presentations may differ.',sv:'Speltid enligt källan; restaurerade, förlängda och regionala versioner kan skilja sig.'},
  cuts: {en:'Duration of the presentation listed by the linked source. Other cuts or projection speeds may differ.',sv:'Speltid för den version som anges av källan. Andra klippningar eller visningshastigheter kan skilja sig.'},
  editions: {en:'Duration of the presentation listed by the linked source; other editions may differ.',sv:'Speltid för den version som anges av källan; andra utgåvor kan skilja sig.'},
};

// Mood suggestions are Kuvert editorial interpretations of genre, not factual ratings.
function suggestMoods(genres = []) {
  const text = genres.join(' ').toLowerCase(), tags = [];
  if (/comedy|satire|parody/.test(text)) tags.push('Funny');
  if (/romance|romantic/.test(text)) tags.push('Romantic');
  if (/adventure|action|western|fantasy/.test(text)) tags.push('Adventurous');
  if (/thriller|suspense|crime|horror/.test(text)) tags.push('Tense');
  if (/horror|noir/.test(text)) tags.push('Dark');
  if (/epic/.test(text)) tags.push('Epic');
  if (/drama|documentary|biograph/.test(text) || !tags.length) tags.push('Reflective');
  return [...new Set(tags)].slice(0,3);
}

// One film's record. Wikidata covers whatever its named source (`via`) doesn't; the runtime's source leads.
function record(f) {
  const have = ['runtime','director',...(f.g ? ['genres'] : [])];
  const named = f.via ? f.via.fields || ['runtime','director'] : [];
  const rest = have.filter(x => !named.includes(x));
  const sources = [
    ...(f.via ? [{label:f.via.label,url:f.via.url,checked:f.via.at,fields:named}] : []),
    ...(rest.length ? [{label:'Wikidata · CC0 film facts',url:wikidataUrl(f.wd),checked:f.at,fields:rest}] : []),
  ].sort((a,b) => b.fields.includes('runtime') - a.fields.includes('runtime'));
  return {
    runtime:f.rt, director:f.dir, ...(f.g ? {genres:f.g} : {}), source:sources[0].url, sources,
    ...(f.g ? {references:f.ref || [], checked:f.at} : {}),
    moods:f.moods || suggestMoods(f.g), moodProvenance:f.moods ? 'Kuvert editorial suggestion' : 'Kuvert genre interpretation',
    editionNotes:typeof f.note === 'object' ? f.note : NOTES[f.note || 'standard'],
  };
}
export const BASIC_METADATA = Object.fromEntries(Object.entries(FILM_TABLE).filter(([,f]) => f.rt).map(([id,f]) => [id,record(f)]));
Object.assign(BASIC_METADATA, CURATED_METADATA);
export const MISSING_RUNTIME_IDS = FILMS.filter(f => !BASIC_METADATA[f.id]?.runtime).map(f => f.id);
export const METADATA_PROVENANCE = {
  checked:'2026-11-11', factsLicense:'Wikidata structured facts: CC0', licenseSource:'https://www.wikidata.org/wiki/Wikidata:Licensing',
  coreFilms:FILMS.length, coreRuntimeCoverage:FILMS.length-MISSING_RUNTIME_IDS.length, missingRuntimeIds:MISSING_RUNTIME_IDS,
  allFilms:Object.keys(FILM_TABLE).length, allRuntimeCoverage:Object.keys(FILM_TABLE).filter(id => BASIC_METADATA[id]?.runtime).length,
  method:'Film identity matched by title and release year; one unambiguous duration or an explicitly sourced presentation. Curated records override general facts.',
  moods:'Kuvert editorial suggestions derived from source genres; curated-film tags are hand-selected.',
  artwork:'No poster artwork is included or inferred in this metadata file.',
};
