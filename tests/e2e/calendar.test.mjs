// The dala horse keeps the Swedish calendar (js/state/calendar.js, js/ui/horse.js): on Lucia, over Christmas
// and at Midsummer every horse on the page wears the day's crown or cap, and says so when patted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { devices } from "playwright";
import { env, newContext, openPage, problems } from "./helpers.mjs";

async function phone() {
  const context = await env.browser.newContext({ ...devices["iPhone 13"], serviceWorkers: "block", reducedMotion: "reduce" });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await context.addInitScript(() => localStorage.setItem("kuvert:welcomed", "1"));
  return context;
}
/** The day it is, and what the horses on the page make of it. */
async function on(page, when) {
  await page.clock.setFixedTime(new Date(when));
  await page.evaluate(() => window.kuvert.app.renderSoon());
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  return page.evaluate(() => {
    const horses = [...document.querySelectorAll("svg.dala")],
      shown = (svg) => [...svg.querySelectorAll(".h-wear")].filter((g) => getComputedStyle(g).display !== "none").map((g) => g.classList[1]);
    return {
      horses: horses.length,
      wear: [...new Set(horses.map((svg) => svg.dataset.wear || "nothing"))].join(),
      // What is drawn on the masthead's horse, of the three things it owns.
      shown: shown(document.querySelector("#hast svg")).join(),
      says: document.getElementById("hast").title.match(/Today.*$/)?.[0] || "",
    };
  });
}

test("the horse keeps the calendar: candles on Lucia, a cap at Christmas, flowers at Midsummer, nothing otherwise", async () => {
  const context = await phone();
  const page = await openPage(context, "/");
  // An ordinary November evening: three horses on the page (the masthead's, the bar's, the station's), bare-headed.
  assert.deepEqual(await on(page, "2026-11-16T19:00:00"), { horses: 3, wear: "nothing", shown: "", says: "" });
  assert.deepEqual(await on(page, "2026-12-13T19:30:00"), { horses: 3, wear: "lucia", shown: "w-lucia", says: "Today it wears a crown of candles, for Lucia." });
  // Kuvert's day lasts until four in the morning: the candles are still lit at two.
  assert.equal((await on(page, "2026-12-14T02:00:00")).wear, "lucia");
  assert.equal((await on(page, "2026-12-14T09:00:00")).wear, "nothing");
  assert.deepEqual(await on(page, "2026-12-24T16:00:00"), { horses: 3, wear: "jul", shown: "w-jul", says: "Today it wears a tomte's cap, for Christmas." });
  assert.deepEqual(await on(page, "2026-06-19T18:00:00"), { horses: 3, wear: "midsommar", shown: "w-midsommar", says: "Today it wears a crown of flowers, for Midsummer." });
  // The crown stands above the horse's head, and nothing is pushed off the screen by it.
  const fits = await page.evaluate(() => {
    const crown = document.querySelector("#hast svg .w-midsommar").getBoundingClientRect(),
      horse = document.querySelector("#hast svg .h-wood").getBoundingClientRect();
    return { onTheHead: crown.width > 4 && crown.left >= horse.left - 6 && crown.right < horse.left + horse.width / 2 && crown.top < horse.top + 6, page: document.documentElement.scrollWidth <= innerWidth };
  });
  assert.deepEqual(fits, { onTheHead: true, page: true });
  // A pat on the day gets the day's greeting first.
  await page.click("#hast");
  await page.waitForFunction(() => !document.getElementById("horseSay").hidden);
  assert.equal(await page.textContent("#horseSay"), "Glad midsommar!");
  // The horse in the bar wears it on the other pages too.
  await page.evaluate(() => window.kuvert.app.router.show("library"));
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector(".brand-horse .w-midsommar")).display !== "none" && document.querySelector(".brand-horse svg").dataset.wear), "midsommar");
  // The day after Midsummer Day it is put away.
  assert.equal((await on(page, "2026-06-21T12:00:00")).wear, "nothing");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("SEAGAL has no horse to dress, on Lucia as on any day", async () => {
  const context = await newContext();
  await context.addInitScript(() => localStorage.setItem("kuvert:mode", "seagal"));
  const page = await openPage(context, "/");
  await page.clock.setFixedTime(new Date("2026-12-13T19:30:00"));
  await page.evaluate(() => window.kuvert.app.renderSoon());
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  assert.deepEqual(await page.evaluate(() => [document.querySelectorAll("svg.dala, .h-wear").length, document.getElementById("hast").title]), [0, "Target acquired"]);
  assert.deepEqual(await problems(page), []);
  await context.close();
});
