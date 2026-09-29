// The station's timetable: what fits on a flap, which track a film leaves from, when trains depart,
// how the board is laid out, and what the ticker and the announcer say.
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveList } from "../../js/data/lists.js";
import { makeCatalog } from "../../js/state/catalog.js";
import { MemoryStorage } from "./helpers.mjs";
import * as T from "../../js/station/timetable.js";
import { britishVoice } from "../../js/station/audio.js";

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
