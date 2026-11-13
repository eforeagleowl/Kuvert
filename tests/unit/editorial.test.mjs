import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCatalogue } from "../../tools/catalogue-check.mjs";
import { buildListDefinition } from "../../js/data/lists.js";
import { FILMS } from "../../js/data/catalogue.js";
import { BASIC_METADATA, METADATA_PROVENANCE } from "../../js/data/basics.js";
import { CURATED_COLLECTIONS, CURATED_METADATA } from "../../js/data/curated.js";
import { CEREMONIES, ceremonyFor } from "../../js/data/ceremonies.js";
import { FILM_TABLE } from "../../js/data/films.js";
import { galaFilms } from "../../js/fun/gala.js";

test("editorial release is complete, sourced and internally consistent", () => {
  const result = validateCatalogue();
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.summary, { films: 664, filmsWithFacts: 664, builtInFilms: 275, collections: 4, curatedUniqueFilms: 26, runtimeCoverage: 275, ceremonies: 98, ballotEntries: 621 });
  assert.equal(METADATA_PROVENANCE.coreRuntimeCoverage, FILMS.length);
});

test("four finite journeys install through the normal list format with stable film IDs", () => {
  assert.deepEqual(CURATED_COLLECTIONS.map(c => c.films.length), [7, 6, 6, 7]);
  for (const collection of CURATED_COLLECTIONS) {
    const installed = buildListDefinition(collection);
    assert.equal(installed.id, collection.id);
    assert.deepEqual(installed.films.map(f => f.id), collection.films.map(f => f.id));
    assert.equal(installed.shelves, null);
    assert.equal(installed.subtitle, collection.subtitle.en, "the list keeps the English subtitle");
    assert.ok(collection.subtitle.sv && collection.badge, collection.id + " has a Swedish subtitle and a seal of its own");
  }
  const phantom = CURATED_COLLECTIONS.filter(c => c.films.some(f => f.id === "1921-the-phantom-carriage"));
  assert.equal(phantom.length, 1, "The Phantom Carriage is in the silent envelope only (A Swedish Winter, version 2)");
  assert.equal(BASIC_METADATA["1925-the-gold-rush"].runtime, 88, "the silent pack uses the 1925 presentation, not the 1942 narration");
});

test("historical ceremony dates and complete fields survive installation", () => {
  assert.equal(ceremonyFor(3).year, 1931, "the Academy's edition label is preserved");
  assert.equal(ceremonyFor(3).date, "1930-11-05", "the actual presentation was held in 1930");
  assert.equal(ceremonyFor(2025).winnerId, "2024-anora");
  assert.equal(ceremonyFor(2026).winnerId, "2025-one-battle-after-another");
  for (const ceremony of CEREMONIES) {
    const installed = buildListDefinition(ceremony);
    assert.equal(installed.films.length, ceremony.nomineeCount);
    assert.equal(installed.films.filter(f => f.s === "W").length, 1);
    assert.ok(!installed.films.some(f => f.tri), "a ballot has no prerequisite films from another ceremony");
  }
});

test("validation rejects partial ballots, duplicate IDs, missing translations and unsourced runtime edits", () => {
  const ceremonies = structuredClone(CEREMONIES);
  ceremonies[0].films.pop();
  assert.ok(validateCatalogue({ ceremonies }).errors.some(e => e.includes("incomplete Best Picture field")));
  const collections = structuredClone(CURATED_COLLECTIONS);
  collections[0].films.push(collections[0].films[0]);
  assert.ok(validateCatalogue({ collections }).errors.some(e => e.includes("duplicate ID")));
  const editorial = structuredClone(CURATED_METADATA);
  delete editorial["1944-double-indemnity"].context.sv;
  assert.ok(validateCatalogue({ editorial }).errors.some(e => e.includes("missing sv context")));
  const metadata = structuredClone(BASIC_METADATA);
  metadata[FILMS[0].id].source = "";
  assert.ok(validateCatalogue({ metadata }).errors.some(e => e.includes("missing metadata provenance")));
});

test("the film table holds every film once, and every list's films have their facts", () => {
  const ids = new Set([...FILMS, ...galaFilms(), ...CURATED_COLLECTIONS.flatMap(c => c.films)].map(f => f.id));
  assert.deepEqual([...ids].sort(), Object.keys(FILM_TABLE).sort(), "the table is exactly the films the lists name");
  // Galan's films used to come without details: every one now has a runtime, a director and a mood to filter by.
  for (const f of galaFilms()) {
    const m = BASIC_METADATA[f.id];
    assert.ok(m?.runtime > 0 && m.director && m.moods.length && /^https:/.test(m.source), f.id);
  }
  assert.equal(METADATA_PROVENANCE.allRuntimeCoverage, METADATA_PROVENANCE.allFilms);
  // A list's film is the table's film: same title, year and series everywhere.
  const godfather = FILMS.find(f => f.id === "1974-the-godfather-part-ii");
  assert.deepEqual(godfather, { t: "The Godfather Part II", y: 1974, s: "W", c: 47, tri: "gf", ord: 2, id: "1974-the-godfather-part-ii" });
  assert.deepEqual(galaFilms().find(f => f.id === godfather.id), godfather);
  // A ballot that spelled a title the Academy's way names the same film; the spelling is kept beside it.
  assert.ok(ceremonyFor(23).films.some(f => f.id === "1950-sunset-boulevard"));
  assert.equal(FILM_TABLE["1950-sunset-boulevard"].aka, "Sunset Blvd.");
  // Where Wikidata's runtimes disagree, a named source settles it and says so.
  const piano = BASIC_METADATA["1993-the-piano"];
  assert.equal(piano.sources[0].label, "Wikipedia · film infobox");
  assert.deepEqual(piano.sources.map(s => s.fields), [["runtime"], ["director", "genres"]]);
  assert.match(piano.editionNotes.en, /other editions may differ/);
});

test("validation catches a film nobody lists, a shared Wikidata item and a shelf the ballot contradicts", () => {
  const orphan = structuredClone(FILM_TABLE);
  orphan["1999-nobody-listed-this"] = { t: "Nobody Listed This", y: 1999, wd: "Q1" };
  assert.ok(validateCatalogue({ table: orphan }).errors.some(e => e.includes("1999-nobody-listed-this is in no list")));
  const twin = structuredClone(FILM_TABLE);
  twin["1927-wings"].wd = twin["1942-casablanca"].wd;
  assert.ok(validateCatalogue({ table: twin }).errors.some(e => e.includes("needs a Wikidata item of its own")));
  const films = structuredClone(FILMS);
  films.find(f => f.id === "1942-casablanca").s = "N";
  assert.ok(validateCatalogue({ films }).errors.some(e => e.includes("1942-casablanca disagrees with the ballot")));
  const bare = structuredClone(FILM_TABLE);
  delete bare["1929-alibi"].rt;
  assert.ok(validateCatalogue({ table: bare, metadata: { ...BASIC_METADATA, "1929-alibi": undefined } }).errors.some(e => e.includes("1929-alibi: no runtime")));
});
