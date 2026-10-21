import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCatalogue } from "../../tools/catalogue-check.mjs";
import { buildListDefinition } from "../../js/data/lists.js";
import { FILMS } from "../../js/data/catalogue.js";
import { BASIC_METADATA, METADATA_PROVENANCE } from "../../js/data/basics.js";
import { CURATED_COLLECTIONS, CURATED_METADATA } from "../../js/data/curated.js";
import { CEREMONIES, ceremonyFor } from "../../js/data/ceremonies.js";

test("editorial release is complete, sourced and internally consistent", () => {
  const result = validateCatalogue();
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.summary, { builtInFilms: 275, collections: 3, curatedUniqueFilms: 19, runtimeCoverage: 275, ceremonies: 98, ballotEntries: 621 });
  assert.equal(METADATA_PROVENANCE.coreRuntimeCoverage, FILMS.length);
});

test("three finite journeys install through the normal list format with stable film IDs", () => {
  assert.deepEqual(CURATED_COLLECTIONS.map(c => c.films.length), [7, 6, 6]);
  for (const collection of CURATED_COLLECTIONS) {
    const installed = buildListDefinition(collection);
    assert.equal(installed.id, collection.id);
    assert.deepEqual(installed.films.map(f => f.id), collection.films.map(f => f.id));
    assert.equal(installed.shelves, null);
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
