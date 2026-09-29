// Swedish mode, in the browser: every page reads Swedish, the station's boards too, and Settings switches
// back to English.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newContext, openPage, problems } from "./helpers.mjs";
import { SV } from "../../js/i18n/sv.js";

// English strings that read differently in Swedish: none of them should be left on screen.
const ENGLISH = Object.keys(SV).filter((en) => SV[en] && SV[en].trim() !== en.trim() && /[a-z]{3}/i.test(en) && !en.includes("{"));

const leftovers = (page) =>
  page.evaluate((english) => {
    const { catalog } = window.kuvert.app;
    const names = new Set([...catalog.films.map((f) => f.t), ...Object.values(catalog.series)]);
    const look = new Set(english.map((s) => s.replace(/\s+/g, " ").trim()));
    const found = new Set();
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let n = w.currentNode; n; n = w.nextNode()) {
      const el = n.nodeType === 3 ? n.parentElement : n;
      if (!el?.checkVisibility() || el.closest("script, style")) continue;
      const texts = n.nodeType === 3 ? [n.nodeValue] : ["aria-label", "title", "placeholder", "alt"].map((a) => n.getAttribute(a) || "");
      for (const s of texts.map((x) => x.replace(/\s+/g, " ").trim())) if (look.has(s) && !names.has(s)) found.add(s);
    }
    return [...found];
  }, ENGLISH);

test("in Swedish: every page, the ticket and both boards, and back to English from Settings", async () => {
  const context = await newContext();
  await context.addInitScript(() => localStorage.getItem("kuvert:lang") ?? localStorage.setItem("kuvert:lang", "sv"));
  const page = await openPage(context, "/");
  assert.equal(await page.getAttribute("html", "lang"), "sv");
  assert.equal(await page.getAttribute("html", "data-translated"), "");
  assert.deepEqual(await page.$$eval(".tabs a", (as) => as.map((a) => a.textContent.trim())), ["Ikväll", "Bibliotek", "Statistik", "Inställningar"]);
  assert.equal((await page.textContent("#drawBtn")).trim(), "Öppna kuvertet");
  assert.deepEqual(await leftovers(page), [], "Tonight");

  // A few watched films with dates and stars, for the arrivals board, the Library and Stats.
  await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    catalog.films.slice(10, 30).forEach((f, i) => {
      store.markSeen(f.id, true);
      store.p.dates[f.id] = new Date(Date.now() - i * 2 * 86400000).toISOString().slice(0, 10);
      store.rate(f.id, (i % 10) / 2 + 0.5);
    });
  });
  await page.click("#drawBtn");
  await page.waitForFunction(() => window.kuvert.app.stage.open && !window.kuvert.app.stage.busy);
  assert.match(await page.textContent("#page-tonight"), /Kvällens (film|vinnare)|Nästa del/);
  assert.deepEqual(await leftovers(page), [], "the ticket");

  await page.evaluate(() => window.kuvert.app.router.show("station"));
  await page.waitForFunction(() => window.kuvert.app.station.fontsReady && !window.kuvert.app.station.busy);
  assert.equal((await page.textContent("#stBoardSv")).trim(), "Avgångar");
  assert.deepEqual(await leftovers(page), [], "the departures board");
  await page.click("#stArr");
  await page.waitForFunction(() => window.kuvert.app.station.kind === "arr" && !window.kuvert.app.station.busy);
  assert.equal((await page.textContent("#stBoardSv")).trim(), "Ankomster");
  assert.match(await page.textContent("#stTicker"), /20 filmer har anlänt/i);
  assert.deepEqual(await page.$$eval("#stHead th", (th) => th.map((x) => x.textContent)), ["Datum", "Film", "År", "Betyg"]);
  assert.deepEqual(await leftovers(page), [], "the arrivals board");

  for (const name of ["library", "stats", "settings"]) {
    await page.evaluate((n) => window.kuvert.app.router.show(n), name);
    await page.waitForFunction((n) => document.documentElement.dataset.page === n, name);
    assert.deepEqual(await leftovers(page), [], name);
  }

  // Settings → Language → English: the page reloads in English and stays that way.
  assert.equal(await page.getAttribute('#languageChoice [data-lang="sv"]', "aria-pressed"), "true");
  await Promise.all([page.waitForEvent("load"), page.click('#languageChoice [data-lang="en"]')]);
  await page.waitForFunction(() => window.kuvert?.app);
  assert.equal(await page.getAttribute("html", "lang"), "en");
  assert.equal(await page.evaluate(() => localStorage.getItem("kuvert:lang")), "en");
  assert.equal((await page.textContent('.tabs a[data-route="tonight"]')).trim(), "Tonight");
  assert.deepEqual(await problems(page), []);
  await context.close();
});
