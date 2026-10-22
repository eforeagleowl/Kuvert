// The station's timetable: what fits on a flap, which track a film leaves from, when trains depart,
// how the board is laid out, and what the ticker and the announcer say.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveList } from "../../js/data/lists.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { MemoryStorage } from "./helpers.mjs";
import * as T from "../../js/station/timetable.js";
import { britishVoice, americanVoice } from "../../js/station/audio.js";
import { KUVERT_C, UNION_STATION, DARK_TERRITORY, stationFor, sign, spokenZulu } from "../../js/station/stations.js";

const catalog = makeCatalog(resolveList(new MemoryStorage()));
const film = (id) => catalog.byId.get(id);
// A list without ceremonies or shelves, like an imported one.
const plain = makeCatalog({ films: [{ t: "Heat", y: 1995, id: "heat" }, { t: "Ronin", y: 1998, id: "ronin" }], name: "Mine", custom: true });

test("every title on the list can be shown on the flaps", () => {
  for (const f of catalog.films) {
    const shown = T.toFlap(f.t);
    for (const ch of shown) assert.ok(T.CHAR_INDEX.has(ch), `${f.t}: ${ch}`);
    for (const n of [9, 14, 18, 26]) {
      const fitted = T.fit(f, n);
      assert.ok(fitted.length <= n && fitted.length > 0, `${f.t} in ${n}: "${fitted}"`);
      assert.doesNotMatch(fitted, /[\s,:&-]$/, `${f.t} in ${n} ends cleanly: "${fitted}"`);
    }
  }
  assert.equal(T.toFlap("Amélie’s Café"), "AMELIE'S CAFE");
  assert.equal(T.toFlap("Närvaro ÅÄÖ"), "NÄRVARO ÅÄÖ");
});

test("long titles lose the subtitle, the 'The', then a word", () => {
  assert.equal(T.fit(film("1959-ben-hur"), 18), "BEN-HUR");
  assert.equal(T.fit(film("2001-the-lord-of-the-rings-the-fellowship-of-the-ring"), 26), "THE FELLOWSHIP OF THE RING");
  assert.equal(T.fit(film("2001-the-lord-of-the-rings-the-fellowship-of-the-ring"), 18), "FELLOWSHIP");
  assert.equal(T.fit(film("2003-the-lord-of-the-rings-the-return-of-the-king"), 18), "RETURN OF THE KING");
  assert.equal(T.fit(film("2024-dune-part-two"), 26), "DUNE: PART TWO");
  assert.equal(T.fit(film("2024-dune-part-two"), 9), "DUNE 2");
  assert.equal(T.fit({ t: "The Best Years of Our Lives", y: 1946 }, 18), "BEST YEARS OF OUR");
  assert.equal(T.fit({ t: "On the Waterfront", y: 1954 }, 9), "ON THE W.");
  assert.equal(T.fit({ t: "On the Waterfront", y: 1954 }, 16), "ON THE WATERFR.");
  assert.equal(T.fit({ t: "The Silence of the Lambs", y: 1991 }, 18), "SILENCE");
});

test("tracks are ceremonies, or a steady one for lists without them", () => {
  assert.equal(T.track(film("1959-ben-hur"), catalog), 32);
  const t = T.track(plain.byId.get("heat"), plain);
  assert.ok(t >= 1 && t <= 19);
  assert.equal(T.track(plain.byId.get("heat"), plain), t);
  assert.equal(T.remark(film("1959-ben-hur")), "VANN");
  assert.equal(T.ceremonyLine(film("1959-ben-hur")), "32nd · 1960");
  assert.equal(T.ceremonyYear(1), 1929);
  assert.equal(T.ceremonyYear(15), 1943);
  assert.equal(T.ceremonyLine(plain.byId.get("heat")), "—");
  assert.deepEqual([1, 2, 3, 11, 12, 21, 22, 56].map(T.ordSv), ["1:a", "2:a", "3:e", "11:e", "12:e", "21:a", "22:a", "56:e"]);
});

test("departures start 6 to 15 minutes out, on the five, then every 5 to 25 minutes", () => {
  const from = new Date("2026-09-29T21:03:40");
  for (const r of [0, 0.5, 0.999]) {
    const times = T.schedule(8, from, () => r);
    assert.equal(times.length, 8);
    const first = (times[0] - from) / 60000;
    assert.ok(first >= 6 - 1 && first <= 16, `first in ${first} min`);
    assert.equal(times[0].getMinutes() % 5, 0);
    for (let i = 1; i < times.length; i++) {
      const gap = (times[i] - times[i - 1]) / 60000;
      assert.ok(gap >= 5 && gap <= 25 && gap % 5 === 0, `gap ${gap}`);
    }
  }
  assert.equal(T.hhmm(new Date("2026-09-29T09:05:00")), "09:05");
  assert.equal(T.minutesUntil(new Date("2026-09-29T21:20:00"), new Date("2026-09-29T21:03:40")), 17);
});

test("narrower boards drop the track, then the year and remarks", () => {
  const cols = (w) => T.chooseLayout(w).groups.map(([k]) => k).join(",");
  assert.equal(cols(1000), "time,year,title,track,rem");
  assert.equal(cols(620), "time,year,title,rem");
  assert.equal(cols(330), "time,title");
  for (const w of [260, 300, 340, 400, 500, 620, 760, 1000, 1300]) {
    const L = T.chooseLayout(w);
    const units = 1.2 + L.groups.reduce((a, [, n]) => a + n, 0) + 0.8 * (L.groups.length - 1);
    assert.ok(units * L.cw <= w + 0.5, `${w}px fits`);
    assert.equal(L.rows, 8);
  }
});

test("the ticker never names a saved ticket; the announcer reads like a station", () => {
  const idle = T.idleTicker({ listName: "Kuvert", count: 12, saved: true });
  assert.match(idle, /Din sparade biljett väntar i kuvertet · Your saved ticket is waiting in the envelope/);
  assert.match(idle, /12 filmer på tidtabellen/);
  assert.match(T.idleTicker({ listName: "Kuvert", count: 0, allWatched: true }), /^Allt sett/);
  const row = { film: film("1959-ben-hur"), time: new Date("2026-09-29T23:05:00") };
  assert.equal(
    T.announcement(row, catalog),
    "Tonight's film: Ben-Hur, from 1959. A Best Picture winner. The 23:05 service will depart from platform 32. Please take your ticket, and enjoy the film.",
  );
  assert.equal(
    T.drawnTicker(row, catalog),
    "Kvällens film: Ben-Hur (1959) · Vann Bästa film vid den 32:a galan · Avgår 23:05 från spår 32 · Tonight's film departs 23:05 from track 32 · Välkommen ombord",
  );
  assert.equal(T.chip(film("1974-the-godfather-part-ii"), catalog), "Nästa del");
  assert.equal(T.chip(film("1959-ben-hur"), catalog), "Kvällens vinnare");
  assert.doesNotMatch(T.announcement({ film: plain.byId.get("heat"), time: row.time }, plain), /Best Picture/);
});

test("the announcer is a British woman when the device has one", () => {
  const v = (name, lang) => ({ name, lang });
  const chrome = [v("Google US English", "en-US"), v("Google UK English Male", "en-GB"), v("Google UK English Female", "en-GB")];
  assert.equal(britishVoice(chrome).name, "Google UK English Female");
  const edge = [v("Microsoft Ryan Online (Natural) - English (United Kingdom)", "en-GB"), v("Microsoft Sonia Online (Natural) - English (United Kingdom)", "en-GB")];
  assert.match(britishVoice(edge).name, /Sonia/);
  const mac = [v("Daniel", "en-GB"), v("Serena", "en-GB")];
  assert.equal(britishVoice(mac).name, "Serena");
  const unknown = [v("Daniel", "en-GB"), v("Kuvert Voice", "en_GB")];
  assert.equal(britishVoice(unknown).name, "Kuvert Voice");
  const windows = [v("Microsoft David - English (United States)", "en-US"), v("Microsoft Zira - English (United States)", "en-US")];
  assert.match(britishVoice(windows).name, /Zira/);
  assert.equal(britishVoice([]), null);
});

test("arrivals: the latest watched first, with your stars, tonight's lit", () => {
  const p = {
    seen: new Set(["1959-ben-hur", "1972-the-godfather", "1954-on-the-waterfront", "1977-annie-hall"]),
    dates: { "1959-ben-hur": "2026-09-20", "1972-the-godfather": "2026-09-29", "1954-on-the-waterfront": "2026-09-29" },
    reviews: { "1959-ben-hur": { rating: 4.5 }, "1972-the-godfather": { rating: 5 } },
  };
  const rows = T.arrivals(p, catalog, 8, "2026-09-29");
  // Same date: the one marked later first. Undated last.
  assert.deepEqual(rows.map((r) => r.film.id), ["1954-on-the-waterfront", "1972-the-godfather", "1959-ben-hur", "1977-annie-hall"]);
  assert.deepEqual(rows.map((r) => r.tonight), [true, true, false, false]);
  assert.deepEqual(T.arrivalStrings(rows[2], [["date", 6], ["year", 4], ["title", 24], ["stars", 5]]), ["20 SEP", "1959", "BEN-HUR", "★★★★½"]);
  assert.equal(T.flapDate("2026-05-03"), " 3 MAJ");
  assert.equal(T.flapStars(3), "★★★");
  assert.equal(T.flapStars(null), "");
  for (const ch of "★½") assert.ok(T.CHAR_INDEX.has(ch));
  assert.equal(T.arrivals(p, catalog, 2, "2026-09-29").length, 2);
  assert.match(T.arrivalsTicker(rows, 4), /^Ankomster · 4 filmer har anlänt · Senast: On the Waterfront \(1954\) · .* · Arrivals · 4 films arrived/);
  assert.match(T.arrivalsTicker([], 0), /^Inga ankomster ännu/);
  const cols = (w) => T.chooseArrivals(w).groups.map(([k]) => k).join(",");
  assert.equal(cols(1000), "date,year,title,stars");
  assert.equal(cols(500), "date,title,stars");
  assert.equal(cols(330), "title,stars");
  for (const w of [260, 330, 500, 760, 1000]) {
    const L = T.chooseArrivals(w);
    const units = 1.2 + L.groups.reduce((a, [, n]) => a + n, 0) + 0.8 * (L.groups.length - 1);
    assert.ok(units * L.cw <= w + 0.5, `${w}px fits`);
  }
});

test("three stations: Kuvert C, Galan's Union Station and SEAGAL's depot", () => {
  assert.equal(stationFor({}), KUVERT_C);
  assert.equal(stationFor({ gala: true }), UNION_STATION);
  assert.equal(stationFor({ seagal: true }), DARK_TERRITORY);
  // Each station says everything Kuvert C does, and hangs its own signs.
  for (const st of [UNION_STATION, DARK_TERRITORY]) {
    for (const key of Object.keys(KUVERT_C)) assert.ok(key in st, `${st.id}: ${key}`);
    for (const key of Object.keys(KUVERT_C.ticket)) assert.ok(key in st.ticket, `${st.id} ticket: ${key}`);
    for (const key of ["name", "place", "tagline", "leave", "toStation", "clock", "tray"]) assert.ok(st[key], `${st.id}: ${key}`);
    for (const kind of ["dep", "arr"]) assert.deepEqual(Object.keys(st.boards[kind].labels), Object.keys(KUVERT_C.boards[kind].labels));
  }
  // A sign is the station's own words, then the visitor's where they differ, or a note.
  assert.deepEqual(sign(KUVERT_C, KUVERT_C.boards.dep.name), ["Avgångar", "Departures"]);
  assert.deepEqual(sign(UNION_STATION, UNION_STATION.boards.dep.name), ["Departures", ""]);
  assert.deepEqual(sign(DARK_TERRITORY, DARK_TERRITORY.draw.fresh), ["Deploy", "Draw tonight’s target"]);
});

test("Union Station: an American clock, Academy Awards ordinals and a newsreel announcer", () => {
  assert.equal(T.time12(new Date("2026-09-29T23:05:00")), "11:05 PM");
  assert.equal(T.time12(new Date("2026-09-29T00:07:00")), "12:07 AM");
  assert.equal(T.time12(new Date("2026-09-29T12:30:00")), "12:30 PM");
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 32, 98, 101, 111, 112].map(T.ordEn), ["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd", "32nd", "98th", "101st", "111th", "112th"]);
  const row = { film: film("1959-ben-hur"), time: new Date("2026-09-29T23:05:00") };
  assert.equal(
    UNION_STATION.announcement(row, catalog),
    "Ladies and gentlemen, tonight's feature: Ben-Hur, from 1959. Winner of Best Picture at the 32nd Academy Awards. The 11:05 PM Hollywood Limited is now boarding on track 32. All aboard, and enjoy the picture!",
  );
  assert.equal(UNION_STATION.drawnTicker(row, catalog), "Now boarding: Ben-Hur (1959) · Best Picture winner, 32nd Academy Awards · Departs 23:05 from track 32 · All aboard");
  assert.match(UNION_STATION.idleTicker({ count: 610 }), /^Welcome to Union Station, Los Angeles · 610 nominees on the timetable/);
  assert.equal(UNION_STATION.rem({ film: film("1959-ben-hur") }), "WON");
  assert.equal(UNION_STATION.chip(film("1959-ben-hur"), catalog), "Tonight’s winner");
  const groups = [["time", 5], ["year", 4], ["title", 20], ["track", 2], ["rem", 4]];
  assert.deepEqual(T.rowStrings(row, groups, catalog, { time: UNION_STATION.time, rem: UNION_STATION.rem }), ["23:05", "1959", "BEN-HUR", "32", "WON"]);
  assert.deepEqual(T.arrivalStrings({ film: film("1959-ben-hur"), date: "2026-05-03", rating: 4 }, [["date", 6], ["title", 20], ["stars", 5]], { months: UNION_STATION.months }), [" 3 MAY", "BEN-HUR", "★★★★"]);
});

test("the depot: Zulu time, a status for every target, and a radio dispatcher", () => {
  const at = new Date(Date.UTC(2026, 8, 29, 7, 5));
  assert.equal(T.zulu(at), "0705Z");
  assert.equal(spokenZulu("0705Z"), "zero seven zero five Zulu");
  assert.equal(spokenZulu("1940Z"), "1940 Zulu");
  const row = { film: film("1959-ben-hur"), time: at };
  assert.equal(
    DARK_TERRITORY.announcement(row, catalog),
    "Dispatch to all units. Target acquired: Ben-Hur, 1959. Deployment at zero seven zero five Zulu, line 32. Take your orders. Dispatch out.",
  );
  assert.equal(DARK_TERRITORY.drawnTicker(row, catalog), "Target acquired: Ben-Hur (1959) · Deploys 0705Z on line 32 · Godspeed");
  // Tonight's target is GO; every other train keeps the same status from visit to visit.
  assert.equal(DARK_TERRITORY.rem({ ...row, hl: true }), "GO");
  assert.equal(DARK_TERRITORY.remText({ ...row, hl: true }), "Tonight's target. Go");
  const statuses = catalog.films.map((f) => DARK_TERRITORY.rem({ film: f }));
  assert.deepEqual(statuses, catalog.films.map((f) => DARK_TERRITORY.rem({ film: f })));
  assert.deepEqual([...new Set(statuses)].sort(), ["DARK", "HOLD", "HOT", "LIVE", "LOCK"]);
  for (const s of statuses) for (const ch of s) assert.ok(T.CHAR_INDEX.has(ch));
  assert.equal(DARK_TERRITORY.counts.some(1), "1 target on the board");
  assert.equal(DARK_TERRITORY.ticket.stamp("29 SEP 2026"), "CLASSIFIED · 29 SEP 2026 ·");
});

test("Union Station's announcer is an American man, where the device has one", () => {
  const v = (name, lang) => ({ name, lang });
  assert.match(americanVoice([v("Microsoft Aria Online (Natural) - English (United States)", "en-US"), v("Microsoft Guy Online (Natural) - English (United States)", "en-US")]).name, /Guy/);
  assert.match(americanVoice([v("Microsoft Zira - English (United States)", "en-US"), v("Microsoft David - English (United States)", "en-US")]).name, /David/);
  assert.equal(americanVoice([v("Samantha", "en-US"), v("Fred", "en_US")]).name, "Fred");
  // Chrome's one US voice is a woman, and there's no one else.
  assert.equal(americanVoice([v("Google UK English Female", "en-GB"), v("Google US English", "en-US")]).name, "Google US English");
  assert.equal(americanVoice([v("Daniel", "en-GB"), v("Google UK English Male", "en-GB")]).name, "Google UK English Male");
  assert.equal(americanVoice([]), null);
});
