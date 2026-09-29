// The station: a departure board for the same draw as the envelope. Its ticket is tonight's ticket.
import { test } from "node:test";
import assert from "node:assert/strict";
import { env, newContext, openPage, go, problems } from "./helpers.mjs";
import { resolveList } from "../../js/data/lists.js";
import { makeCatalog } from "../../js/state/catalog.js";
import * as T from "../../js/station/timetable.js";

// The built-in list, as the page has it, for working out a film's track: its ceremony, or for an
// honorable mention (no ceremony) the steady made-up one.
const catalog = makeCatalog(resolveList({ getItem: () => null }));
const trackOf = (id) => T.track(catalog.byId.get(id), catalog);

const ready = (page) => page.waitForFunction(() => window.kuvert.app.station.fontsReady && document.documentElement.dataset.page === "station" && !window.kuvert.app.station.busy);
const drawn = (page) => page.waitForFunction(() => !window.kuvert.app.station.busy && !document.getElementById("stTicket").hidden);
const board = (page) =>
  page.evaluate(() => {
    const { station, store } = window.kuvert.app;
    return { ids: station.rows.map((r) => r.film.id), hl: station.rows.map((r) => r.hl), flaps: station.board.text(), current: store.p.current, drawn: station.drawn?.film.id ?? null };
  });

test("the station: the board, a draw, the printed ticket, and over to Tonight with it", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  // A few films already watched: they never appear on the board.
  const watched = await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    const ids = catalog.films.slice(0, 200).map((f) => f.id);
    for (const id of ids) store.markSeen(id, true);
    return ids;
  });
  await page.click("#toStation");
  await ready(page);
  assert.equal(await page.evaluate(() => location.hash), "#station");
  assert.equal(await page.getAttribute('.tabs a[data-route="tonight"]', "aria-current"), "page", "Tonight's tab stays lit");
  assert.equal(await page.isVisible("#page-tonight"), false);
  let b = await board(page);
  assert.equal(b.ids.length, 8);
  assert.ok(b.ids.every((id) => !watched.includes(id)), "no watched film on the board");
  assert.equal(await page.textContent("#stDrawMain"), "Dra kvällens film");
  assert.match(await page.textContent("#stTicker"), /Välkommen till Kuvert C · 75 filmer på tidtabellen/);
  assert.match(await page.textContent("#stCount"), /75 films on the timetable/);

  // Draw: tonight's film is first on the board, lit, and it's tonight's ticket.
  await page.click("#stDraw");
  await drawn(page);
  b = await board(page);
  assert.equal(b.drawn, b.current);
  assert.equal(b.ids[0], b.current);
  assert.deepEqual(b.hl, [true, false, false, false, false, false, false, false]);
  assert.equal(new Set(b.ids).size, b.ids.length, "no film twice on the board");
  const film = await page.evaluate((id) => {
    const { catalog } = window.kuvert.app;
    const f = catalog.byId.get(id);
    return { ...f, number: catalog.ticketNumber(f) };
  }, b.current);
  assert.ok(b.flaps[0].includes(T.fit(film, 26)), `the board reads ${b.flaps[0]}`);
  assert.equal(await page.textContent(".st-ttitle"), film.t);
  const ticket = await page.textContent("#stTicket");
  assert.match(ticket, new RegExp("Nr " + film.number + " / 275"));
  assert.match(ticket, /Kvällens (film|vinnare)|Nästa del/);
  const track = trackOf(film.id);
  assert.match(ticket, new RegExp("Track" + track + "Ceremony"));
  assert.match(ticket, new RegExp("Spår" + track + "\\d"));
  assert.match(ticket, new RegExp("Ceremony" + (Number.isInteger(film.c) ? T.ceremonyLine(film) : "—")));
  assert.match(ticket, /Take your ticket/);
  assert.equal(await page.getAttribute("#stTicket", "class"), "st-ticket inked", "with reduced motion the ticket is simply there, stamped");
  assert.match(await page.textContent("#stTicker"), new RegExp("Kvällens film: .* · Avgår \\d\\d:\\d\\d från spår " + track + " "));
  assert.match(await page.textContent("#stLive"), new RegExp("Tonight's film: "));
  assert.equal(await page.textContent("#stDrawMain"), "Dra igen");

  // Take the ticket: Tonight, with that film open in the envelope.
  await page.click(".st-take");
  await page.waitForFunction(() => document.documentElement.dataset.page === "tonight" && window.kuvert.app.stage.open && !window.kuvert.app.stage.busy);
  assert.equal(await page.textContent("#pickTitle"), film.t);
  assert.equal(await page.evaluate(() => location.hash), "#tonight");

  // Watched: back at the station, it has left the board and the ticket is gone.
  await page.click("#markBtn");
  await page.waitForFunction((id) => window.kuvert.app.store.p.seen.has(id), film.id);
  await page.click("#toStation");
  await ready(page);
  b = await board(page);
  assert.ok(!b.ids.includes(film.id), "a watched film leaves the board");
  assert.equal(b.drawn, null);
  assert.equal(await page.isVisible("#stTicket"), false);
  assert.equal(await page.textContent("#stDrawMain"), "Dra kvällens film");

  // Enter draws; Escape heads back to the envelope.
  await page.focus("#stationHeading");
  await page.keyboard.press("Enter");
  await drawn(page);
  assert.notEqual((await board(page)).current, film.id);
  await page.focus("#stationHeading");
  // With a message up, Escape closes the message first.
  if (await page.isVisible("#toast")) {
    await page.keyboard.press("Escape");
    await page.waitForSelector("#toast", { state: "hidden" });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.page), "station");
  }
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.documentElement.dataset.page === "tonight");
  // The browser's back button returns to the station.
  await page.goBack();
  await ready(page);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("a saved ticket is printed first at the station, never drawn over or named before", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  // An honorable mention: no ceremony, so it leaves from a made-up track.
  const film = await page.evaluate(() => {
    const { store, catalog, stage } = window.kuvert.app;
    const f = catalog.films.find((x) => x.t.length > 8 && !x.tri && !Number.isInteger(x.c));
    store.pick(f.id);
    stage.syncPick();
    return { id: f.id, t: f.t };
  });
  await page.click("#toStation");
  await ready(page);
  assert.equal(await page.textContent("#stDrawMain"), "Skriv ut biljetten");
  assert.equal(await page.textContent("#stDrawSub"), "Print your saved ticket");
  const text = await page.evaluate(() => document.getElementById("page-station").innerText + document.getElementById("stTicker").textContent);
  assert.ok(!text.includes(film.t), "the saved ticket isn't named on the station");
  assert.match(await page.textContent("#stTicker"), /Your saved ticket is waiting in the envelope/);
  await page.click("#stDraw");
  await drawn(page);
  assert.equal((await board(page)).current, film.id, "the saved ticket, not a new draw");
  assert.equal(await page.textContent(".st-ttitle"), film.t);
  const track = trackOf(film.id);
  assert.ok(track >= 1 && track <= 19);
  assert.match(await page.textContent("#stTicket"), new RegExp("Track" + track + "Ceremony—"));
  await page.click("#stDraw");
  await drawn(page);
  assert.notEqual((await board(page)).current, film.id, "then Draw again draws a new film");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("with full motion: the ticket prints and gets stamped once, the announcer speaks, and nothing replays", async () => {
  const context = await env.browser.newContext({ serviceWorkers: "block", reducedMotion: "no-preference" });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await context.addInitScript(() => {
    localStorage.setItem("kuvert:welcomed", "1");
    // The announcer, overheard.
    window.__spoken = [];
    const synth = window.speechSynthesis || (window.speechSynthesis = {});
    synth.speak = (u) => u.text.trim() && window.__spoken.push({ text: u.text, lang: u.lang });
    synth.cancel = () => {};
    synth.getVoices = () => [];
  });
  const page = await openPage(context, "/#station");
  await ready(page);
  await page.click("#stDraw");
  await page.waitForSelector("#stTicket.printing", { timeout: 8000 });
  await page.waitForSelector("#stTicket.inked", { timeout: 8000 });
  const cur = await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    return catalog.byId.get(store.p.current);
  });
  await page.waitForFunction(() => window.__spoken.length > 0, null, { timeout: 5000 });
  const spoken = await page.evaluate(() => window.__spoken);
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].lang, "en-GB");
  assert.match(spoken[0].text, new RegExp(`^Tonight's film: ${cur.t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}, from ${cur.y}\\. .*The \\d\\d:\\d\\d service will depart from platform ${trackOf(cur.id)}\\. Please take your ticket, and enjoy the film\\.$`));
  const still = () =>
    page.evaluate(() => {
      const t = document.getElementById("stTicket");
      return { cls: t.className, moving: t.getAnimations({ subtree: true }).length };
    });
  // Away and back: the ticket is just there, not printed or stamped again.
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.documentElement.dataset.page === "tonight");
  await page.click("#toStation");
  await page.waitForFunction(() => document.documentElement.dataset.page === "station");
  assert.deepEqual(await still(), { cls: "st-ticket inked", moving: 0 });

  // Leaving mid-print: the same.
  await page.click("#stDraw");
  await page.waitForSelector("#stTicket.printing", { timeout: 8000 });
  await page.click("#leaveStation");
  await page.waitForFunction(() => document.documentElement.dataset.page === "tonight");
  await page.waitForTimeout(1600);
  await page.click("#toStation");
  await page.waitForFunction(() => document.documentElement.dataset.page === "station");
  assert.deepEqual(await still(), { cls: "st-ticket inked", moving: 0 });
  assert.equal(await page.evaluate(() => window.__spoken.length), 1, "no announcement for a ticket printed while you were away");

  // The announcer's switch is remembered.
  await page.click("#stVoice");
  assert.equal(await page.getAttribute("#stVoice", "aria-pressed"), "false");
  await page.reload();
  await page.waitForFunction(() => window.kuvert?.app);
  assert.equal(await page.getAttribute("#stVoice", "aria-pressed"), "false");
  assert.equal(await page.getAttribute("#stSound", "aria-pressed"), "true");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("SEAGAL has no station", async () => {
  const context = await newContext();
  await context.addInitScript(() => localStorage.setItem("kuvert:mode", "seagal"));
  const page = await openPage(context, "/#station");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.page), "tonight");
  assert.equal(await page.evaluate(() => location.hash), "#tonight");
  assert.equal(await page.isVisible("#toStation"), false);
  await go(page, "/#tonight");
  await page.evaluate(() => window.kuvert.app.router.show("station"));
  assert.equal(await page.evaluate(() => document.documentElement.dataset.page), "tonight");
  assert.deepEqual(await problems(page), []);
  await context.close();
});
