// Tonight after the UX round: the reveal on a phone, the next day's "Watched it", films seen before
// Kuvert, the share choice, where to watch, and the Home Screen hint.
import { test } from "node:test";
import assert from "node:assert/strict";
import { devices } from "playwright";
import { env, newContext, openPage, problems } from "./helpers.mjs";

const opened = (page) => page.waitForFunction(() => !window.kuvert.app.stage.busy && window.kuvert.app.stage.open);

async function phone({ welcomed = true } = {}) {
  const context = await env.browser.newContext({ ...devices["iPhone 13"], serviceWorkers: "block", reducedMotion: "reduce" });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await context.addInitScript((welcomed) => {
    window.__problems = [];
    document.addEventListener("securitypolicyviolation", (e) => window.__problems.push("CSP: " + e.violatedDirective));
    if (welcomed) localStorage.setItem("kuvert:welcomed", "1");
  }, welcomed);
  return context;
}

test("on a phone, a returning visitor sees the envelope and its button, and the draw lands the title on screen", async () => {
  const context = await phone();
  const page = await openPage(context, "/");
  const box = (sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().toJSON(), sel);
  const tabs = await box(".tabbar");
  assert.ok((await box("#drawBtn")).bottom <= tabs.top, "the draw button clears the tab bar");
  assert.equal(await page.textContent("#drawBtn"), "Öppna kuvertetOpen the envelope", "English under the Swedish");
  assert.match(await page.textContent("#eligibleCount"), /^\d+ films left in the envelope$/);
  await page.click("#drawBtn");
  await opened(page);
  const title = await box("#pickTitle");
  assert.ok(title.top >= (await box(".appbar")).bottom && title.bottom <= tabs.top, "the film's title is on screen");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the next day: Watched it dates the film the night it was drawn, and opens on its stars", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  const film = await page.evaluate(() => {
    const { store, catalog, stage } = window.kuvert.app;
    const f = catalog.films.find((x) => !x.tri);
    store.pick(f.id);
    store.p.drawnOn = "2026-01-10";
    store.save("ticket");
    stage.syncPick();
    return f.id;
  });
  await page.reload();
  await page.waitForFunction(() => window.kuvert?.app);
  // The saved ticket is the first thing on Tonight, still sealed.
  const order = await page.evaluate(() => [...document.querySelectorAll("#page-tonight > :not([hidden])")].map((e) => e.id || e.className.split(" ")[0]));
  assert.ok(order.indexOf("resumePick") < order.indexOf("stage"), "above the envelope: " + order.join(", "));
  assert.match(await page.textContent("#resumeLabel"), /watched it, or still on for tonight\?/);
  await page.click("#watchedIt");
  await opened(page);
  await page.waitForSelector("#watchedPanel:not([hidden])");
  assert.deepEqual(await page.evaluate((id) => ({ seen: window.kuvert.app.store.p.seen.has(id), date: window.kuvert.app.store.p.dates[id] }), film), { seen: true, date: "2026-01-10" });
  assert.match(await page.textContent("#wpWhen"), /10 Jan 2026/);
  assert.equal(await page.isHidden("#wpExtras"), true, "the night itself: just the stars and Done");
  await page.click("#wpMore");
  assert.equal(await page.isVisible("#wpRank"), true);
  // Stars put it in the ranking.
  await page.evaluate((id) => window.kuvert.app.stage.rate(id, 4), film);
  assert.match(await page.textContent("#wpRank"), /^#1 of 1 in your ranking/);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("Seen it before: watched with no date, and another film comes out of the envelope", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  await page.click("#drawBtn");
  await opened(page);
  const first = await page.evaluate(() => window.kuvert.app.store.p.current);
  assert.match(await page.getAttribute("#watchLink", "href"), /^https:\/\/www\.justwatch\.com\/us\/search\?q=/, "where to watch: JustWatch, in your streaming country");
  await page.click("#seenBefore");
  await opened(page);
  const after = await page.evaluate((id) => ({ seen: window.kuvert.app.store.p.seen.has(id), dated: id in window.kuvert.app.store.p.dates, current: window.kuvert.app.store.p.current }), first);
  assert.equal(after.seen, true);
  assert.equal(after.dated, false, "no date: it never counts toward your pace");
  assert.ok(after.current && after.current !== first, "another film is on the ticket");
  assert.match(await page.textContent("#toastText"), /marked as seen before/);
  // Undo puts the first film back on the ticket, unwatched.
  await page.click("#undoBtn");
  await page.waitForFunction((id) => window.kuvert.app.store.p.current === id && !window.kuvert.app.store.p.seen.has(id), first);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("films seen before Kuvert: tick them off in the Library, undated, straight from the welcome", async () => {
  const context = await newContext({ welcomed: false });
  const page = await openPage(context, "/");
  await page.click("#welcomeSeen");
  await page.waitForSelector("#backfillBar:not([hidden])");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.page), "library");
  const ids = await page.evaluate(() => [...document.querySelectorAll("#list .tick")].slice(0, 3).map((b) => b.dataset.key.slice(5)));
  for (const id of ids) await page.click(`#list [data-key="tick-${id}"]`);
  const marks = await page.evaluate((ids) => ids.map((id) => [window.kuvert.app.store.p.seen.has(id), id in window.kuvert.app.store.p.dates]), ids);
  assert.deepEqual(marks, ids.map(() => [true, false]), "watched, with no date");
  await page.click("#backfillDone");
  assert.equal(await page.isHidden("#backfillBar"), true);
  // Back to normal: a tick now means watched tonight.
  const next = await page.evaluate(() => [...document.querySelectorAll("#list .tick[aria-pressed=false]")][0].dataset.key.slice(5));
  await page.click(`#list [data-key="tick-${next}"]`);
  assert.equal(await page.evaluate((id) => !!window.kuvert.app.store.p.dates[id], next), true);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("Share offers the ticket as an image or a sealed invitation", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  await page.click("#drawBtn");
  await opened(page);
  await page.click("#shareBtn");
  await page.waitForSelector("#journeyDialog[open]");
  assert.equal(await page.textContent("#journeyTitle"), "Share tonight’s film");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ticket image", exact: true }).click();
  assert.match((await download).suggestedFilename(), /^kuvert-.*\.png$/);
  assert.equal(await page.evaluate(() => document.getElementById("journeyDialog").open), false);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the Home Screen hint: on an iPhone after the first film, until Got it", async () => {
  const context = await phone();
  const page = await openPage(context, "/");
  assert.equal(await page.isHidden("#installHint"), true, "nothing watched yet");
  await page.evaluate(() => {
    const { store, catalog, stage } = window.kuvert.app;
    stage.toggleSeen(catalog.films[0].id);
  });
  await page.waitForSelector("#installHint:not([hidden])");
  assert.match(await page.textContent("#installText"), /tap Share, then Add to Home Screen/);
  await page.click("#installLater");
  assert.equal(await page.isHidden("#installHint"), true);
  await page.reload();
  await page.waitForFunction(() => window.kuvert?.app);
  assert.equal(await page.isHidden("#installHint"), true, "put away for good");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("Restore from a file takes a whole-library backup as well as a progress file", async () => {
  const context = await newContext();
  // Headless Chromium has no file pickers to click through: use the download and <input type=file> path.
  await context.addInitScript(() => {
    delete window.showSaveFilePicker;
    delete window.showOpenFilePicker;
  });
  const page = await openPage(context, "/#settings");
  const download = page.waitForEvent("download");
  await page.click("#saveLibrary");
  const file = await (await download).path();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click("#openFile")]);
  await chooser.setFiles(file);
  await page.waitForSelector("#journeyDialog[open]");
  assert.equal(await page.textContent("#journeyTitle"), "Restore your full library");
  assert.deepEqual(await problems(page), []);
  await context.close();
});
