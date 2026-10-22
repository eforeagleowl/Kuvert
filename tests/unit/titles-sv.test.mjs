// Swedish film titles: this file runs as a browser that chose Swedish, so it has its own process and sets
// the language before anything is imported.
import { test } from "node:test";
import assert from "node:assert/strict";

globalThis.localStorage = { getItem: (k) => (k === "kuvert:lang" ? "sv" : null), setItem() {}, removeItem() {} };
const { swedish } = await import("../../js/i18n/index.js");
const { SV_TITLES } = await import("../../js/i18n/titles-sv.js");
const { localFilm } = await import("../../js/i18n/titles.js");
const { FILMS, KUVERT } = await import("../../js/data/catalogue.js");
const { CURATED_COLLECTIONS } = await import("../../js/data/curated.js");
const { galaFilms } = await import("../../js/fun/gala.js");
const { resolveList, exportableList } = await import("../../js/data/lists.js");
const { makeCatalog } = await import("../../js/state/catalog.js");
const { exactMatch } = await import("../../js/tmdb/client.js");
const { letterboxdMatcher } = await import("../../js/import/importers.js");
const { MemoryStorage } = await import("./helpers.mjs");
const T = await import("../../js/station/timetable.js");

const catalog = makeCatalog(resolveList(new MemoryStorage()));
const godfather = catalog.byId.get("1972-the-godfather");

test("every Swedish title belongs to a film Kuvert has, and reads like a title", () => {
  assert.equal(swedish, true);
  const known = new Set([...FILMS, ...galaFilms(), ...CURATED_COLLECTIONS.flatMap((c) => c.films)].map((f) => f.id));
  const entries = Object.entries(SV_TITLES);
  assert.ok(entries.length > 300, entries.length + " titles");
  for (const [id, sv] of entries) {
    assert.ok(known.has(id), id + " is a Kuvert film");
    assert.ok(sv.trim() === sv && sv.length > 0 && !/\((film|\d{4})/.test(sv), id + ": " + sv);
  }
  assert.equal(SV_TITLES["1939-gone-with-the-wind"], "Borta med vinden");
  assert.equal(SV_TITLES["1957-the-seventh-seal"], "Det sjunde inseglet");
  assert.equal(SV_TITLES["2023-oppenheimer"], undefined, "a film that kept its title in Sweden isn't listed");
});

test("in Swedish the catalog shows Swedish titles and keeps the original; the list itself never changes", () => {
  assert.equal(godfather.t, "Gudfadern");
  assert.equal(godfather.orig, "The Godfather");
  assert.equal(catalog.list.films.find((f) => f.id === "1972-the-godfather").t, "The Godfather");
  assert.equal(exportableList(catalog.list).body.films.find((f) => f.year === 1972 && /Godfather/.test(f.title)).title, "The Godfather", "exports keep the original");
  assert.equal(catalog.byId.get("2023-oppenheimer").orig, undefined);
  assert.equal(catalog.series.gf, "Gudfadern");
  assert.equal(catalog.series.dune, "Dune");
  assert.deepEqual(localFilm({ id: "1957-wild-strawberries", t: "Wild Strawberries", y: 1957 }), { id: "1957-wild-strawberries", t: "Smultronstället", y: 1957, orig: "Wild Strawberries" });
  assert.equal(KUVERT.series.gf, "The Godfather");
});

test("either title finds a film", () => {
  for (const q of ["gudfadern", "godfather", "Borta med", "gone with the wind", "gökboet", "cuckoo"])
    assert.ok(catalog.films.some((f) => catalog.matchesSearch(f, q) && /godfather|gone-with|cuckoo/.test(f.id)), q);
});

test("Swedish Wikipedia's titles where it and Wikidata differed", () => {
  assert.equal(SV_TITLES["1970-patton"], "Patton – Pansargeneralen");
  assert.equal(SV_TITLES["1937-a-star-is-born"], "Hollywood");
  assert.equal(SV_TITLES["1941-citizen-kane"], "En sensation");
  assert.equal(SV_TITLES["2002-the-pianist"], undefined, "\"Pianisten\" is its title in Finland; in Sweden it kept the original");
});

test("every Swedish title can be shown on the station's flaps", () => {
  const films = [...catalog.films, ...galaFilms().map(localFilm), ...CURATED_COLLECTIONS.flatMap((c) => c.films).map(localFilm)].filter((f) => f.orig);
  assert.ok(films.length > 300, films.length + " films with a Swedish title");
  for (const f of films) {
    for (const ch of T.toFlap(f.t)) assert.ok(T.CHAR_INDEX.has(ch), `${f.t}: ${ch}`);
    for (const n of [9, 14, 18, 26]) {
      const fitted = T.fit(f, n);
      assert.ok(fitted.length <= n && fitted.length > 0, `${f.t} in ${n}: "${fitted}"`);
      assert.doesNotMatch(fitted, /[\s,:&-]$/, `${f.t} in ${n} ends cleanly: "${fitted}"`);
    }
  }
  assert.equal(T.toFlap("Patton – Pansargeneralen"), "PATTON - PANSARGENERALEN");
});

test("TMDB and Letterboxd are matched on the original title", () => {
  assert.ok(exactMatch({ title: "The Godfather", original_title: "The Godfather", release_date: "1972-03-14" }, godfather));
  assert.equal(letterboxdMatcher(catalog.films)("The Godfather", 1972)?.id, "1972-the-godfather");
  assert.equal(letterboxdMatcher(catalog.films)("Gudfadern", 1972), null);
});
