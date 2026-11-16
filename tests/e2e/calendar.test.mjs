// The dala horse keeps the Swedish calendar (js/state/calendar.js, js/ui/horse.js, js/ui/outfits.js): on
// nine occasions of the year every horse on the page wears the day's crown, cap or kerchief, and says so
// when patted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
      worn = (svg) => [...svg.querySelectorAll(".h-wear")].map((g) => g.classList[1]).join();
    return {
      horses: horses.length,
      wear: [...new Set(horses.map((svg) => svg.dataset.wear || "nothing"))].join(),
      // What is drawn on each horse: one outfit at most, the same on all of them.
      worn: [...new Set(horses.map(worn))].join("|"),
      says: document.getElementById("hast").title.match(/Today.*$/)?.[0] || "",
    };
  });
}
/** Where the masthead horse's outfit is drawn, and whether the page still fits the screen with it on. */
const fit = (page) =>
  page.evaluate(() => {
    const outfit = document.querySelector("#hast svg .h-wear").getBoundingClientRect(),
      horse = document.querySelector("#hast svg .h-wood").getBoundingClientRect();
    return {
      // On the head: over the front half of the horse, and reaching above its back.
      onTheHead: outfit.width > 4 && outfit.height > 4 && outfit.left >= horse.left - 8 && outfit.right < horse.left + horse.width * 0.55 && outfit.top < horse.top + horse.height * 0.2,
      // Painted: every part of it has a colour of its own.
      painted: [...document.querySelectorAll("#hast svg .h-wear :is(path, circle, ellipse, rect)")].every((part) => part.hasAttribute("fill") || part.hasAttribute("stroke")),
      page: document.documentElement.scrollWidth <= innerWidth,
    };
  });

/**
 * The horse's speech bubble as the screen shows it: all of it on the screen, and its own paper showing down
 * its left edge, which is only so when nothing is drawn over it. (On a phone it stands in front of the bar.)
 */
async function bubble(page) {
  await page.waitForFunction(() => document.getElementById("horseSay").getAnimations().every((a) => a.playState !== "running"));
  const box = await page.evaluate(() => {
    const say = document.getElementById("horseSay"),
      r = say.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height, screen: innerWidth, seen: getComputedStyle(say).visibility === "visible", paper: getComputedStyle(document.documentElement).getPropertyValue("--paper").trim() };
  });
  const sliver = await page.screenshot({ clip: { x: box.x + 5, y: box.y + 5, width: 2, height: box.height - 10 }, scale: "css" });
  const colours = await page.evaluate(async (png) => {
    const picture = new Image();
    picture.src = "data:image/png;base64," + png;
    await picture.decode();
    const canvas = Object.assign(document.createElement("canvas"), { width: picture.width, height: picture.height }),
      ctx = canvas.getContext("2d");
    ctx.drawImage(picture, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    return Array.from({ length: data.length / 4 }, (_, i) => [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]);
  }, sliver.toString("base64"));
  const paper = [1, 3, 5].map((i) => parseInt(box.paper.slice(i, i + 2), 16));
  return { onScreen: box.seen && box.x >= 0 && box.x + box.width <= box.screen && box.y >= 0, readable: colours.length > 10 && colours.every((c) => c.every((v, i) => Math.abs(v - paper[i]) <= 14)) };
}

// One evening of each occasion in 2026: what the horse wears, what its tooltip says of it, how it greets.
const DAYS = [
  ["2026-04-04T19:00:00", "pask", "Today it wears an Easter witch's kerchief, for Easter.", "Glad påsk!"],
  ["2026-04-30T21:00:00", "valborg", "Today it wears a student's cap, for Valborg.", "Glad Valborg!"],
  ["2026-06-06T12:00:00", "nationaldag", "Today it flies the flag, for the National Day.", "Glad nationaldag!"],
  ["2026-06-19T18:00:00", "midsommar", "Today it wears a crown of flowers, for Midsummer.", "Glad midsommar!"],
  ["2026-08-08T19:00:00", "kraftskiva", "Today it wears a paper hat, for the crayfish season.", "Skål!"],
  ["2026-10-04T15:00:00", "kanelbulle", "Today it carries a cinnamon bun, for Cinnamon Bun Day.", "Kanelbulle?"],
  ["2026-10-07T19:00:00", "birgitta", "Today it wears a Bridgettine crown, for Saint Bridget.", "Grattis, Birgitta!"],
  ["2026-12-13T19:30:00", "lucia", "Today it wears a crown of candles, for Lucia.", "Glad Lucia!"],
  ["2026-12-24T16:00:00", "jul", "Today it wears a tomte's cap, for Christmas.", "God jul!"],
];

test("the horse keeps the calendar: a kerchief at Easter, candles on Lucia, a cap at Christmas, and nothing on an ordinary day", async () => {
  const context = await phone();
  const page = await openPage(context, "/");
  // An ordinary November evening: three horses on the page (the masthead's, the bar's, the station's), bare-headed.
  assert.deepEqual(await on(page, "2026-11-16T19:00:00"), { horses: 3, wear: "nothing", worn: "", says: "" });
  for (const [when, id, says, greeting] of DAYS) {
    assert.deepEqual(await on(page, when), { horses: 3, wear: id, worn: "w-" + id, says }, id);
    // It sits on the horse's head, in its own colours, and pushes nothing off the screen.
    assert.deepEqual(await fit(page), { onTheHead: true, painted: true, page: true }, id);
    // The first pat of the day gets the day's greeting: in a bubble over its head that can be read, long
    // greeting or short, though the bar is right above the horse on a phone. A screen reader hears it too.
    await page.click("#hast");
    assert.equal(await page.textContent("#horseSay"), greeting, id);
    assert.deepEqual(await bubble(page), { onScreen: true, readable: true }, id + ": " + greeting);
    assert.equal(await page.textContent("#announcement"), greeting, id);
  }
  // Kuvert's day lasts until four in the morning: the candles are still lit at two, and out by nine.
  assert.equal((await on(page, "2026-12-14T02:00:00")).wear, "lucia");
  assert.deepEqual(await on(page, "2026-12-14T09:00:00"), { horses: 3, wear: "nothing", worn: "", says: "" });
  // Easter moves with the year: the kerchief is on in late March 2027, a week before 2026's Easter date.
  assert.equal((await on(page, "2027-03-28T12:00:00")).wear, "pask");
  assert.equal((await on(page, "2027-04-04T12:00:00")).wear, "nothing");
  // A horse that is out of sight says nothing anyone can see: scrolled off the top of the screen, or left
  // on Tonight when another page opens while it is still speaking.
  await on(page, "2026-06-19T18:00:00");
  // (Read once things are still: under reduced motion a change is still a transition, a frame or so long.)
  const said = async () => {
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    await page.waitForFunction(() => document.getAnimations().every((a) => a.constructor.name !== "CSSTransition" || a.playState !== "running"));
    return page.evaluate(() => {
      const say = document.getElementById("horseSay"),
        style = getComputedStyle(say);
      return say.hidden || style.display === "none" ? "nothing" : style.visibility === "hidden" ? "unseen" : "shown";
    });
  };
  await page.evaluate(() => scrollTo(0, 500));
  assert.ok(await page.evaluate(() => document.getElementById("hast").getBoundingClientRect().bottom < 0), "the horse is off the top of the screen");
  await page.evaluate(() => window.kuvert.app.horse.speak("Bravo!"));
  assert.equal(await said(), "unseen");
  await page.evaluate(() => scrollTo(0, 0));
  await page.evaluate(() => window.kuvert.app.horse.speak("Hej!"));
  assert.equal(await said(), "shown");
  // The horse in the bar wears the day's outfit on the other pages too.
  await page.evaluate(() => window.kuvert.app.router.show("library"));
  await page.waitForFunction(() => document.documentElement.dataset.page === "library");
  assert.equal(await said(), "nothing");
  assert.deepEqual(await page.evaluate(() => [document.querySelector(".brand-horse svg").dataset.wear, document.querySelectorAll(".brand-horse .h-wear.w-midsommar").length]), ["midsommar", 1]);
  // The day after Midsummer Day it is put away.
  assert.equal((await on(page, "2026-06-21T12:00:00")).wear, "nothing");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the cinema passport's horse is never in costume: not on screen, and not in the journal you download", async () => {
  const context = await newContext();
  await context.clock.setFixedTime(new Date("2026-12-13T19:30:00"));
  const page = await openPage(context, "/");
  await page.evaluate(() => window.kuvert.app.router.show("stats"));
  await page.click("#openPassport");
  await page.waitForSelector("#passportDialog[open] .passport svg.dala");
  // A render while the passport is open dresses the page's horses for Lucia, and leaves the passport's alone.
  await page.evaluate(() => window.kuvert.app.renderSoon());
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  assert.deepEqual(
    await page.evaluate(() => [document.querySelectorAll("#hast svg .h-wear.w-lucia").length, document.querySelectorAll(".passport .h-wear").length, document.querySelector(".passport svg.dala").dataset.wear ?? null]),
    [1, 0, null],
  );
  // The journal is a page of its own, with its own few styles: an outfit would be shapes it has no colours for.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download journal" }).click();
  const journal = readFileSync(await (await download).path(), "utf8");
  assert.match(journal, /class="h-wood"/);
  assert.doesNotMatch(journal, /h-wear|w-lucia/);
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
