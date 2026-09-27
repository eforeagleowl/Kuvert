// Generates tests/fixtures/golden.json by driving the ORIGINAL app (classic/index.html) in a headless browser.
// It records what the original writes (codes, backup files, browser saves, signatures) and how it reads
// every older format, including the errors it raises. tests/unit/compat.test.mjs holds the rebuild to it.
// Run: node tools/golden.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";

const { server, url } = await serve();
const browser = await chromium.launch();

async function openOriginal(setup) {
  const context = await browser.newContext({ serviceWorkers: "block" });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  if (setup) {
    await page.goto(url + "/tools/blank.html");
    await page.evaluate(setup);
  }
  await page.goto(url + "/classic/index.html");
  await page.waitForFunction(() => typeof encode === "function" && document.readyState === "complete");
  if (errors.length) throw Error("The original app failed to start: " + errors.join("; "));
  return { page, context };
}

// Runs inside the original app: fills every kind of progress deterministically.
function fillProgress({ seed, withSettings }) {
  let s = seed >>> 0;
  const rnd = () => ((s = (s + 0x6d2b79f5) >>> 0), (((s ^ (s >>> 15)) * (s | 1)) >>> 0) / 4294967296);
  const pickN = (arr, n) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
  };
  const ids = FILMS.map((f) => f.id);
  const watched = pickN(ids, Math.min(40, Math.floor(ids.length * 0.3)));
  const unwatched = ids.filter((id) => !watched.includes(id));
  seen = new Set(watched);
  dates = {};
  watched.slice(0, Math.floor(watched.length * 0.85)).forEach((id, i) => {
    dates[id] = "2026-0" + (1 + (i % 9)) + "-" + String(1 + ((i * 7) % 28)).padStart(2, "0");
  });
  current = BY_ID.get(unwatched[0]);
  drawnOn = "2026-09-20";
  skipped = new Set([unwatched[1]]);
  reviews = {};
  const notes = ["Riktigt bra! Åh, vilken film.", 'He said "no" — then yes.', "", "Line one\nline two", "Mästerverk ★"];
  watched.slice(0, 20).forEach((id, i) => {
    const rating = i % 5 === 3 ? null : ((i % 10) + 1) / 2;
    const note = notes[i % notes.length];
    if (rating || note) reviews[id] = { note, rating };
  });
  recent = [unwatched[0], watched[0], unwatched[2], watched[3], unwatched[4]];
  moodTags = {};
  const moods = MOODS;
  ids.slice(0, 10).forEach((id, i) => (moodTags[id] = moods.filter((_, k) => (k + i) % 3 === 0)));
  runtimes = {};
  pickN(ids, 60).forEach((id) => (runtimes[id] = 80 + Math.floor(rnd() * 150)));
  rankings = [...watched.slice(0, 15), unwatched[5], unwatched[6]];
  verdicts = {};
  snubs = {};
  for (const id of watched) {
    const f = BY_ID.get(id);
    if (!isWinner(f)) continue;
    const v = ["yes", "no", "unsure"][Object.keys(verdicts).length % 3];
    verdicts[id] = v;
    if (v === "no") {
      const rival = FILMS.find((x) => x.c === f.c && x.id !== id && (x.s === "N" || x.s === "W"));
      snubs[id] = rival ? rival.id : "other";
    }
  }
  lbx = {};
  unwatched.slice(7, 12).forEach((id, i) => (lbx[id] = { rating: (i + 2) / 2, date: i % 2 ? null : "2025-12-0" + (i + 1) }));
  matches = {};
  pickN(ids, 30).forEach((id, i) => (matches[id] = 1000 + i * 37));
  shelf = new Set(pickN(ids, 6));
  for (const id of seen) skipped.delete(id);
  posterPaths = {};
  pickN(ids, 20).forEach((id, i) => (posterPaths[id] = i % 4 === 0 ? null : "/p" + i + "Xy_z-" + i + ".jpg"));
  moodSuggestions = {};
  pickN(ids, 15).forEach((id, i) => (moodSuggestions[id] = moods.filter((_, k) => (k * 3 + i) % 4 === 0)));
  savedAt = "2026-09-26T20:15:00.000Z";
  if (withSettings) {
    country = "SE";
    drawSelection = true;
    filter = "all";
    query = "godfather";
    statusFilter = "W";
    decadeFilter = 1970;
    runtimeLimit = 120;
    timeMode = "120";
    moodFilter = "Dark";
    finishTime = "";
    finishDeadline = null;
    subscriptionOnly = true;
    selectedServices = { SE: [8, 337] };
    wallSort = "rank";
    lastBackup = { at: "2026-09-25T10:00:00.000Z", signature: "deadbeef", kind: "file" };
    availability = { SE: { [ids[0]]: { at: 1700000000000, ids: [8] } } };
    providerDirectories = { SE: { at: 1700000000000, providers: [{ id: 8, name: "Netflix" }] } };
  }
}

// Runs inside the original app: decode an input the way the app would, as plain JSON.
function decodeWith(input) {
  const plain = (d) => {
    const out = {};
    for (const [k, v] of Object.entries(d)) out[k] = v instanceof Set ? [...v].sort() : v;
    return out;
  };
  try {
    let d;
    const legacyIds = input.legacy === "original" ? LEGACY_IDS : input.legacy === "local" ? LOCAL_LEGACY_IDS : null;
    if (input.kind === "code") d = parseCode(input.value, legacyIds);
    else if (input.kind === "file") d = validateProgress(input.value, legacyIds ? { legacyIds } : {});
    else if (input.kind === "browser") d = validateProgress(input.value, { browserLegacy: true, ...(legacyIds ? { legacyIds } : {}) });
    return { ok: plain(d) };
  } catch (e) {
    return { error: e.message };
  }
}

const out = { generatedFrom: "index.html (the original app)", builtin: {}, decode: [], custom: {} };

// 1. Built-in list: an empty save and a full one, as code, backup file, browser save and signature.
{
  const { page, context } = await openOriginal();
  out.builtin.films = await page.evaluate(() => FILMS.map((f) => f.id));
  out.builtin.empty = await page.evaluate(() => {
    savedAt = "2026-09-26T08:00:00.000Z";
    return { data: stateData(), code: encode(), signature: progressSignature() };
  });
  out.builtin.full = await page.evaluate((a) => {
    (0, eval)("(" + a + ")")({ seed: 7, withSettings: true });
    persistBrowser();
    return {
      data: stateData(),
      code: encode(),
      file: payload(),
      signature: progressSignature(),
      browser: localStorage.getItem(KEY),
    };
  }, fillProgress.toString());
  await context.close();
}

// 2. Reading every older format, and the errors.
{
  const { page, context } = await openOriginal();
  const full = out.builtin.full.data;
  const code = out.builtin.full.code;
  const [, b64, sum] = code.split(".");
  const retiredSample = ["2011-hugo", "2018-bohemian-rhapsody"];
  // Retired once and back on the list since: an older backup that has it keeps it.
  const back = "2013-the-wolf-of-wall-street";
  const legacyIds = await page.evaluate(() => ({ original: LEGACY_IDS, local: LOCAL_LEGACY_IDS }));
  const toLegacy = (ids, order) => {
    const set = new Set(ids);
    return BigInt("0b" + order.map((id) => (set.has(id) ? "1" : "0")).join("")).toString(36);
  };
  const someLocal = legacyIds.local.filter((_, i) => i % 3 === 0);
  const someOriginal = legacyIds.original.filter((_, i) => i % 4 === 1);
  const indexDates = (order, ids) => Object.fromEntries(ids.slice(0, 5).map((id, i) => [String(order.indexOf(id)), "2025-0" + (i + 1) + "-1" + i]));
  const inputs = [
    ["KU7 code", { kind: "code", value: code }],
    ["KU4 prefix", { kind: "code", value: "KU4." + b64 + "." + sum }],
    ["KU6 prefix, padded with spaces", { kind: "code", value: "  KU6." + b64 + "." + sum + "\n" }],
    ["backup file v7", { kind: "file", value: JSON.parse(out.builtin.full.file) }],
    ["backup file v5", { kind: "file", value: { ...full, v: 5 } }],
    ["backup v4 on an older catalogue with retired films", {
      kind: "file",
      value: {
        ...full,
        v: 4,
        catalogue: "kuvert-2026-09-v1",
        seen: [...full.seen, ...retiredSample],
        dates: { ...full.dates, [retiredSample[0]]: "2026-01-02" },
        reviews: { ...full.reviews, [retiredSample[1]]: { note: "gone", rating: 3 } },
        rankings: [retiredSample[0], ...full.rankings],
        current: "2015-the-martian",
      },
    }],
    ["backup v6 on the hm-v2 catalogue", { kind: "file", value: { ...full, v: 6, catalogue: "kuvert-2026-09-hm-v2" } }],
    ["backup on the catalogue before the last 25 films were added", { kind: "file", value: { ...full, catalogue: "kuvert-2026-09-expanded-v7" } }],
    ["backup v4 with a film that was retired and is back", {
      kind: "file",
      value: {
        ...full,
        v: 4,
        catalogue: "kuvert-2026-09-v1",
        seen: [...full.seen.filter((id) => id !== back), back],
        dates: { ...full.dates, [back]: "2026-01-02" },
        rankings: [back, ...full.rankings.filter((id) => id !== back)],
        current: full.current === back ? null : full.current,
      },
    }],
    ["first app backup v1 (indices), updated list", { kind: "file", legacy: "local", value: { app: "envelope", v: 1, seen: someLocal.map((id) => legacyIds.local.indexOf(id)), dates: indexDates(legacyIds.local, someLocal) } }],
    ["first app backup v3 (indices), original list", { kind: "file", legacy: "original", value: { app: "envelope", v: 3, seen: someOriginal.map((id) => legacyIds.original.indexOf(id)), dates: indexDates(legacyIds.original, someOriginal) } }],
    ["first app backup v2 holding only a code", { kind: "file", legacy: "local", value: { app: "envelope", v: 2, code: toLegacy(someLocal, legacyIds.local) } }],
    ["first app browser save", { kind: "browser", value: { seen: someLocal.slice(0, 9).map((id) => legacyIds.local.indexOf(id)), dates: {} } }],
    ["first app browser save with a code", { kind: "browser", value: { code: toLegacy(someLocal.slice(0, 20), legacyIds.local) } }],
    ["base-36 code, updated list", { kind: "code", legacy: "local", value: toLegacy(someLocal, legacyIds.local) }],
    ["base-36 code, original list", { kind: "code", legacy: "original", value: toLegacy(someOriginal, legacyIds.original) }],
    ["base-36 code, empty", { kind: "code", legacy: "local", value: "0" }],
    // Errors
    ["error: typo in the code", { kind: "code", value: "KU7." + b64 + "." + (sum[0] === "0" ? "1" : "0") + sum.slice(1) }],
    ["error: code cut short", { kind: "code", value: "KU7." + b64 }],
    ["error: older code without a list", { kind: "code", value: "abc123" }],
    ["error: base-36 code too long", { kind: "code", legacy: "original", value: "z".repeat(60) }],
    ["error: not base-36", { kind: "code", legacy: "local", value: "abc-123" }],
    ["error: version 8", { kind: "file", value: { ...full, v: 8 } }],
    ["error: another list's backup", { kind: "file", value: { ...full, catalogue: "custom:l123:40" } }],
    ["error: unknown catalogue", { kind: "file", value: { ...full, catalogue: "kuvert-1999" } }],
    ["error: unknown film", { kind: "file", value: { ...full, seen: [...full.seen, "1901-nope"] } }],
    ["error: watched and skipped", { kind: "file", value: { ...full, skipped: [full.seen[0]] } }],
    ["error: bad date", { kind: "file", value: { ...full, dates: { ...full.dates, [full.seen[0]]: "2026-02-30" } } }],
    ["error: date for an unwatched film", { kind: "file", value: { ...full, dates: { [full.current]: "2026-02-03" } } }],
    ["error: rating off the half-star grid", { kind: "file", value: { ...full, reviews: { [full.seen[0]]: { note: "", rating: 4.3 } } } }],
    ["error: note too long", { kind: "file", value: { ...full, reviews: { [full.seen[0]]: { note: "x".repeat(501), rating: null } } } }],
    ["error: six recent picks", { kind: "file", value: { ...full, recent: full.seen.slice(0, 6) } }],
    ["error: current already watched", { kind: "file", value: { ...full, current: full.seen[0] } }],
    ["error: bad timestamp", { kind: "file", value: { ...full, saved: "yesterday" } }],
    ["error: bad mood", { kind: "file", value: { ...full, moods: { [full.seen[0]]: ["Sleepy"] } } }],
    ["error: bad runtime", { kind: "file", value: { ...full, runtimes: { [full.seen[0]]: 0 } } }],
    ["error: ranking repeats", { kind: "file", value: { ...full, rankings: [full.seen[0], full.seen[0]] } }],
    ["error: bad verdict", { kind: "file", value: { ...full, verdicts: { [full.seen[0]]: "maybe" } } }],
    ["error: bad Letterboxd entry", { kind: "file", value: { ...full, lbx: { [full.seen[0]]: { rating: 7 } } } }],
    ["error: bad match", { kind: "file", value: { ...full, matches: { [full.seen[0]]: -4 } } }],
    ["error: bad shelf", { kind: "file", value: { ...full, shelf: ["1901-nope"] } }],
    ["error: bad snub", { kind: "file", value: { ...full, snubs: { [full.seen[0]]: "1901-nope" } } }],
    ["error: missing watched list", { kind: "file", value: { app: "kuvert", v: 7, catalogue: full.catalogue } }],
    ["error: not an object", { kind: "file", value: [1, 2, 3] }],
    ["error: first app index out of range", { kind: "file", legacy: "original", value: { app: "envelope", v: 1, seen: [5000] } }],
  ];
  for (const [name, input] of inputs) out.decode.push({ name, input, result: await page.evaluate(decodeWith, input) });
  await context.close();
}

// 3. An imported list: its save carries the list definition and its own catalogue.
{
  const setup = () => {
    localStorage.clear();
    const films = [
      { title: "Metropolis", year: 1927, shelf: "W" },
      { title: "M", year: 1931, shelf: "N" },
      { title: "Stalker", year: 1979, shelf: "H" },
      { title: "Alien", year: 1979, series: "Alien", part: 1 },
      { title: "Aliens", year: 1986, series: "Alien", part: 2 },
      { title: "Amélie", year: 2001 },
    ];
    localStorage.setItem("golden:films", JSON.stringify(films));
  };
  const { page, context } = await openOriginal(setup);
  // The original builds the list the same way its Import button does, then reloads onto it.
  await page.evaluate(() => {
    const def = buildListDefinition({ name: "Golden list", subtitle: "For the tests", palette: "falu", films: JSON.parse(localStorage.getItem("golden:films")), id: "lgolden" });
    const lists = readCustomLists();
    lists[def.id] = def;
    writeCustomLists(lists);
    localStorage.setItem("kuvert:activeList", def.id);
  });
  await page.reload();
  await page.waitForFunction(() => typeof encode === "function" && LIST.custom);
  out.custom = await page.evaluate(() => {
    seen = new Set([FILMS[0].id, FILMS[3].id]);
    dates = { [FILMS[0].id]: "2026-03-04" };
    current = FILMS[4];
    drawnOn = "2026-03-05";
    reviews = { [FILMS[3].id]: { note: "In space…", rating: 4.5 } };
    savedAt = "2026-09-26T09:00:00.000Z";
    persistBrowser();
    return {
      definition: LIST.definition,
      storageKey: KEY,
      data: stateData(),
      code: encode(),
      browser: localStorage.getItem(KEY),
      decoded: (() => {
        const d = parseCode(encode());
        return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v instanceof Set ? [...v].sort() : v]));
      })(),
    };
  });
  await context.close();
}

await browser.close();
server.close();
mkdirSync(new URL("../tests/fixtures/", import.meta.url), { recursive: true });
writeFileSync(new URL("../tests/fixtures/golden.json", import.meta.url), JSON.stringify(out, null, 1) + "\n");
console.log("Wrote tests/fixtures/golden.json: " + out.decode.length + " decode cases, " + out.decode.filter((d) => d.result.error).length + " of them errors.");
