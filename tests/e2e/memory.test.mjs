// What Kuvert remembers when a day comes round (js/state/memory.js): a line on Tonight for the film you
// watched on this day in an earlier year, and the dala horse's own day, the day of your first film.
import { test } from "node:test";
import assert from "node:assert/strict";
import { devices } from "playwright";
import { env, newContext, openPage, problems } from "./helpers.mjs";

const frames = (page) => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
/** Watches these films, [id, date, stars or none], and lets the page draw itself again. */
async function watch(page, films) {
  await page.evaluate((films) => {
    const { store } = window.kuvert.app;
    for (const [id, date, stars] of films) {
      store.markSeen(id, true, { date });
      if (stars) store.rate(id, stars);
    }
    window.kuvert.app.renderSoon();
  }, films);
  await frames(page);
}
async function on(page, when) {
  await page.clock.setFixedTime(new Date(when));
  await page.evaluate(() => window.kuvert.app.renderSoon());
  await frames(page);
}
const line = (page) => page.evaluate(() => (document.getElementById("onThisDay").hidden ? null : document.getElementById("onThisDay").innerText.replace(/\s+/g, " ").trim()));

test("on this day: Tonight remembers the film you watched when the evening last came round", async () => {
  const context = await newContext();
  await context.clock.setFixedTime(new Date("2026-11-23T19:30:00"));
  const page = await openPage(context, "/");
  assert.equal(await line(page), null, "nothing watched, nothing to remember");
  await watch(page, [["1976-rocky", "2025-11-23", 3], ["1942-casablanca", "2025-11-23", 4.5], ["1975-jaws", "2024-11-23", 5], ["1995-heat", "2026-11-23", 5], ["1955-marty", "2025-11-22", 5]]);
  // Last year's evening, its best film first, and the other one counted. Screen readers get the stars in words.
  assert.equal(await line(page), "A year ago tonight you watched Casablanca ★★★★½ , 4.5 stars , and 1 more");
  assert.equal(await page.locator("#onThisDay .memory-stars").getAttribute("aria-hidden"), "true");
  // It sits under the envelope's button, and the name opens that film's ticket.
  const order = await page.evaluate(() => ["drawBtn", "eligibleCount", "onThisDay", "toStation"].map((id) => Math.round(document.getElementById(id).getBoundingClientRect().top)));
  assert.deepEqual(order, [...order].sort((a, b) => a - b), "in reading order: " + order);
  await page.click("#onThisDay button");
  await page.waitForFunction(() => !window.kuvert.app.stage.busy && window.kuvert.app.stage.open);
  assert.equal(await page.evaluate(() => window.kuvert.app.stage.shown.id), "1942-casablanca");
  await frames(page);
  assert.equal(await line(page), null, "out of the way while a ticket is out");
  await page.click("#ticketClose");
  await page.waitForFunction(() => !window.kuvert.app.stage.busy && !window.kuvert.app.stage.open);
  await frames(page);
  assert.match(await line(page), /^A year ago tonight you watched Casablanca/);
  // The evening lasts until four; after that the day has gone, and an evening two years on is said so.
  await on(page, "2026-11-24T02:00:00");
  assert.match(await line(page), /^A year ago tonight/);
  await on(page, "2026-11-24T09:00:00");
  assert.equal(await line(page), null);
  await on(page, "2027-11-22T20:00:00");
  assert.equal(await line(page), "2 years ago tonight you watched Marty ★★★★★ , 5 stars");
  assert.deepEqual(await problems(page), []);
  await context.close();
  // SEAGAL keeps no such memories.
  const seagal = await newContext();
  await seagal.clock.setFixedTime(new Date("2026-11-23T19:30:00"));
  await seagal.addInitScript(() => localStorage.setItem("kuvert:mode", "seagal"));
  const file = await openPage(seagal, "/");
  await watch(file, [["1942-casablanca", "2025-11-23", 4.5]]);
  assert.equal(await line(file), null);
  assert.deepEqual(await problems(file), []);
  await seagal.close();
});

test("the horse's own day: a paper crown and a balloon when your first film here comes round", async () => {
  const context = await env.browser.newContext({ ...devices["iPhone 13"], serviceWorkers: "block", reducedMotion: "reduce" });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await context.addInitScript(() => localStorage.setItem("kuvert:welcomed", "1"));
  await context.clock.setFixedTime(new Date("2026-11-22T19:30:00"));
  const page = await openPage(context, "/");
  const horse = () =>
    page.evaluate(() => ({
      wear: [...new Set([...document.querySelectorAll("svg.dala")].map((svg) => svg.dataset.wear || "nothing"))].join(),
      worn: [...new Set([...document.querySelectorAll("svg.dala")].map((svg) => [...svg.querySelectorAll(".h-wear")].map((g) => g.classList[1]).join()))].join("|"),
      says: document.getElementById("hast").title.replace(/^.*?(Next: [^.]*\.|Fully painted\.)\s*/, ""),
    }));
  const pat = async () => {
    await page.click("#hast");
    return page.textContent("#horseSay");
  };
  // The first film was on 23 November 2025; two more since, one of them with no date.
  await watch(page, [["1976-rocky", "2025-11-23", 4], ["1942-casablanca", "2026-02-01", 5]]);
  await page.evaluate(() => window.kuvert.app.store.markSeen("1975-jaws", true, { date: null }));
  // The day before: an ordinary day.
  await on(page, "2026-11-22T19:30:00");
  assert.deepEqual(await horse(), { wear: "nothing", worn: "", says: "" });
  // The day: every horse on the page in its paper crown, and it says how long it has been, and how many films.
  await on(page, "2026-11-23T19:30:00");
  assert.deepEqual(await horse(), { wear: "kalas", worn: "w-kalas", says: "Today it wears a paper crown, for a day of its own. 1 year ago today you watched your first film here." });
  assert.equal(await pat(), "Ett år och 3 filmer!");
  assert.equal(await page.textContent("#announcement"), "Ett år och 3 filmer!");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "nothing pushed off the screen");
  // The same evening Tonight remembers that first film.
  assert.match(await page.evaluate(() => document.getElementById("onThisDay").innerText), /A year ago tonight you watched\s+Rocky/);
  await on(page, "2026-11-24T09:00:00");
  assert.deepEqual(await horse(), { wear: "nothing", worn: "", says: "" });
  // A first film on a day the calendar keeps: the calendar's outfit, and both greetings, its own first.
  await page.evaluate(() => window.kuvert.app.store.markSeen("1955-marty", true, { date: "2024-12-13" }));
  await on(page, "2026-12-13T19:30:00");
  assert.deepEqual(await horse(), { wear: "lucia", worn: "w-lucia", says: "Today it wears a crown of candles, for Lucia. 2 years ago today you watched your first film here." });
  assert.equal(await pat(), "2 år och 4 filmer!");
  assert.equal(await pat(), "Glad Lucia!");
  assert.deepEqual(await problems(page), []);
  await context.close();
});
