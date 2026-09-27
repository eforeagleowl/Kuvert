// The rebuild in a real browser: it starts clean on every page, and the evening works end to end.
import { test } from "node:test";
import assert from "node:assert/strict";
import { env, newContext, openPage, go, problems, nextProgress } from "./helpers.mjs";

test("every page starts without errors or policy violations", async () => {
  const context = await newContext();
  const page = await openPage(context, "/next/");
  for (const name of ["library", "stats", "settings", "tonight"]) {
    await page.click(`a[data-route="${name}"]:visible`);
    await page.waitForFunction((n) => document.documentElement.dataset.page === n && !document.getElementById("page-" + n).hidden, name);
  }
  assert.equal(await page.evaluate(() => location.hash), "#tonight");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the draw: seal, dial and ticket, with the full animation", async () => {
  const context = await env.browser.newContext({ serviceWorkers: "block", reducedMotion: "no-preference" });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await context.addInitScript(() => localStorage.setItem("kuvert:welcomed", "1"));
  const page = await openPage(context, "/next/");
  await page.click("#drawBtn");
  // Mid-draw the dial rolls; afterwards it shows the film's year.
  await page.waitForSelector("#ticket:not([hidden])", { timeout: 6000 });
  await page.waitForFunction(() => !window.kuvert.app.stage.busy, null, { timeout: 6000 });
  const { title, year, current } = await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    return { title: document.getElementById("pickTitle").textContent, year: window.kuvert.app.stage.nixie.value, current: catalog.byId.get(store.p.current) };
  });
  assert.equal(title, current.t);
  assert.equal(year, current.y);
  assert.equal(await page.getAttribute("#stage", "data-state"), "open");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("an evening: draw, mark watched, rate, undo", async () => {
  const context = await newContext();
  const page = await openPage(context, "/next/");
  await page.click("#drawBtn");
  await page.waitForSelector("#ticket:not([hidden])");
  const id = await page.evaluate(() => window.kuvert.app.store.p.current);
  assert.ok(id);

  await page.click("#markBtn");
  await page.waitForFunction((id) => window.kuvert.app.store.p.seen.has(id), id);
  assert.match(await page.textContent("#tally"), /^1 of \d+ watched/);
  assert.ok(await page.isVisible(".stamp-sedd"));

  // Keys 1–5 rate the stub that's showing.
  await page.locator("body").press("4");
  await page.waitForFunction((id) => window.kuvert.app.store.p.reviews[id]?.rating === 4, id);

  // Saved for the classic app to read, in the shared format.
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kuvert:v4")));
  assert.ok(saved.seen.includes(id));
  assert.equal(saved.v, 7);

  // Undo goes back to before the mark, stars and all.
  await page.click("#undoBtn");
  await page.waitForFunction((id) => !window.kuvert.app.store.p.seen.has(id), id);
  assert.equal((await nextProgress(page)).reviews[id], undefined);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("draw again never repeats the film on the ticket", async () => {
  const context = await newContext();
  const page = await openPage(context, "/next/");
  await page.click("#drawBtn");
  await page.waitForSelector("#ticket:not([hidden])");
  let last = await page.evaluate(() => window.kuvert.app.store.p.current);
  for (let i = 0; i < 6; i++) {
    await page.click("#againBtn");
    await page.waitForFunction((last) => window.kuvert.app.store.p.current !== last && !window.kuvert.app.stage.busy, last);
    last = await page.evaluate(() => window.kuvert.app.store.p.current);
  }
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("SEAGAL: in through the brave link, out on the second request", async () => {
  const context = await newContext();
  const page = await openPage(context, "/next/#settings");
  await page.click("#braveLink");
  await page.waitForFunction(() => document.documentElement.dataset.mode === "seagal" && window.kuvert?.app);
  assert.equal(await page.evaluate(() => window.kuvert.app.list.id), "seagal");
  assert.equal(await page.title(), "SEAGAL — Classified");

  await page.click("#standDownFooter");
  assert.match(await page.textContent("#toastText"), /Request denied/);
  await Promise.all([page.waitForEvent("load"), page.click("#standDownFooter")]);
  await page.waitForFunction(() => window.kuvert?.app);
  assert.equal(await page.evaluate(() => document.documentElement.dataset.mode ?? null), null);
  assert.equal(await page.evaluate(() => window.kuvert.app.list.id), "builtin");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("a backup file made by the rebuild loads back in", async () => {
  const context = await newContext();
  // Headless Chromium has no file pickers to click through: use the download and <input type=file> path.
  await context.addInitScript(() => {
    delete window.showSaveFilePicker;
    delete window.showOpenFilePicker;
  });
  const page = await openPage(context, "/next/");
  await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    for (const f of catalog.films.slice(3, 9)) store.markSeen(f.id, true);
    store.rate(catalog.films[3].id, 3.5);
  });
  const before = await nextProgress(page);
  await page.click('a[data-route="settings"]:visible');
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#saveFile")]);
  assert.equal(download.suggestedFilename(), "kuvert-progress.json");
  const file = await download.path();

  await page.evaluate(() => window.kuvert.app.store.reset());
  await go(page, "/next/#settings");
  assert.equal((await nextProgress(page)).seen.length, 0);
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click("#openFile")]);
  await chooser.setFiles(file);
  await page.waitForSelector("#restoreDialog[open]");
  await page.click("#replaceProgress");
  await page.waitForFunction((n) => window.kuvert.app.store.p.seen.size === n, before.seen.length);
  const after = await nextProgress(page);
  assert.deepEqual(after.seen, before.seen);
  assert.deepEqual(after.reviews, before.reviews);
  assert.deepEqual(await problems(page), []);
  await context.close();
});
