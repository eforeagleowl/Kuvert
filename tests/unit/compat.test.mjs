// The rebuild must read and write progress exactly like the original app. The expected values come from
// tests/fixtures/golden.json, recorded from the original app itself (node tools/golden.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FILMS, KUVERT } from "../../js/data/catalogue.js";
import { LEGACY_IDS, LOCAL_LEGACY_IDS } from "../../js/compat/legacy-ids.js";
import { listContext, validateProgress } from "../../js/compat/validate.js";
import { parseCode, encodeCode, checksum } from "../../js/compat/codes.js";
import { encodeLegacy, decodeLegacy } from "../../js/compat/legacy-code.js";
import { stateData, progressSignature, browserSave } from "../../js/compat/serialize.js";

const golden = JSON.parse(readFileSync(new URL("../fixtures/golden.json", import.meta.url), "utf8"));
const builtin = listContext({ films: FILMS, catalogue: KUVERT.catalogue, olderCatalogues: KUVERT.olderCatalogues, retired: KUVERT.retired });

// Memory form of a v7 save, as the new state model holds it.
function progressFrom(d) {
  return {
    seen: new Set(d.seen),
    dates: { ...d.dates },
    current: d.current,
    drawnOn: d.drawnOn,
    skipped: new Set(d.skipped),
    reviews: structuredClone(d.reviews),
    recent: [...d.recent],
    moods: structuredClone(d.moods),
    runtimes: { ...d.runtimes },
    rankings: [...d.rankings],
    verdicts: { ...d.verdicts },
    lbx: structuredClone(d.lbx),
    matches: { ...d.matches },
    shelf: new Set(d.shelf),
    snubs: { ...d.snubs },
    posterPaths: { ...d.posterPaths },
    moodSuggestions: structuredClone(d.moodSuggestions),
    saved: d.saved,
    stamps: {},
  };
}
const plain = (d) => {
  const out = {};
  for (const [k, v] of Object.entries(d)) if (k !== "stamps") out[k] = v instanceof Set ? [...v].sort() : v;
  return out;
};

test("the catalogue matches the original app's", () => {
  assert.deepEqual(FILMS.map((f) => f.id), golden.builtin.films);
});

for (const which of ["empty", "full"]) {
  test(`writes the ${which} save byte for byte like the original`, () => {
    const g = golden.builtin[which];
    const p = progressFrom(g.data);
    const data = stateData(p, { ids: builtin.ids, catalogue: builtin.catalogue });
    assert.equal(JSON.stringify(data), JSON.stringify(g.data), "same fields in the same order");
    assert.equal(encodeCode(data), g.code, "same progress code");
    assert.equal(progressSignature(data), g.signature, "same sync signature");
    if (g.file) assert.equal(JSON.stringify(data, null, 2), g.file, "same backup file");
  });
}

test("writes the browser save the original reads", () => {
  const g = golden.builtin.full;
  const saved = JSON.parse(g.browser);
  const p = progressFrom(g.data);
  const out = browserSave(p, { ids: builtin.ids, catalogue: builtin.catalogue }, {
    settings: saved.settings,
    lastBackup: saved.lastBackup,
    availability: saved.availability,
    providerDirectories: saved.providerDirectories,
  });
  assert.equal(JSON.stringify(out), g.browser);
});

for (const c of golden.decode) {
  test("reads " + c.name, () => {
    const { input, result } = c;
    const legacyIds = input.legacy === "original" ? LEGACY_IDS : input.legacy === "local" ? LOCAL_LEGACY_IDS : null;
    const run = () => {
      if (input.kind === "code") return parseCode(input.value, builtin, legacyIds);
      if (input.kind === "file") return validateProgress(structuredClone(input.value), builtin, legacyIds ? { legacyIds } : {});
      return validateProgress(structuredClone(input.value), builtin, { browserLegacy: true, ...(legacyIds ? { legacyIds } : {}) });
    };
    if (result.error) assert.throws(run, { message: result.error });
    else assert.deepEqual(plain(run()), result.ok);
  });
}

test("reads and writes an imported list's save like the original", () => {
  const g = golden.custom;
  const def = g.definition;
  const ctx = listContext({ films: def.films, catalogue: def.catalogue, custom: true });
  const data = stateData(progressFrom(g.data), { ids: ctx.ids, catalogue: ctx.catalogue, custom: true, definition: def });
  assert.equal(JSON.stringify(data), JSON.stringify(g.data));
  assert.equal(encodeCode(data), g.code);
  assert.deepEqual(plain(parseCode(g.code, ctx)), g.decoded);
  assert.equal(g.storageKey, "kuvert:list:" + def.id);
});

test("old base-36 codes round-trip", () => {
  const ids = LOCAL_LEGACY_IDS.filter((_, i) => i % 5 === 2);
  assert.deepEqual([...decodeLegacy(encodeLegacy(ids, LOCAL_LEGACY_IDS), LOCAL_LEGACY_IDS)], ids);
});

test("stamps ride along, and a save without them reads the same", () => {
  const g = golden.builtin.full;
  const p = progressFrom(g.data);
  p.stamps = { [g.data.seen[0]]: "2026-09-26T21:00:00.000Z", $ranking: "2026-09-26T21:01:00.000Z", "1901-nope": "2026-01-01T00:00:00Z", [g.data.seen[1]]: "not a date" };
  const data = stateData(p, { ids: builtin.ids, catalogue: builtin.catalogue });
  const back = parseCode(encodeCode(data), builtin);
  assert.deepEqual(back.stamps, { [g.data.seen[0]]: "2026-09-26T21:00:00.000Z", $ranking: "2026-09-26T21:01:00.000Z" });
  assert.deepEqual(plain(back), plain(parseCode(g.code, builtin)));
});

test("checksum is FNV-1a", () => {
  assert.equal(checksum(""), "811c9dc5");
  assert.equal(checksum("a"), "e40c292c");
});
