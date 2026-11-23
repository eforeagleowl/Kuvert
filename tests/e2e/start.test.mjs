// A slow start: the page is on the screen before the app has started (on a slow phone, for seconds). What
// is there must be where it will stay, and a tap on the envelope's button must not be lost (js/boot.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { env, problems } from "./helpers.mjs";

/** A page whose app script is held back until `start()` is called: the first paint, kept on the screen. */
async function held({ width, height, returning }) {
  const context = await env.browser.newContext({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700, serviceWorkers: "block", reducedMotion: "reduce" });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  if (returning) await context.addInitScript(() => localStorage.setItem("kuvert:welcomed", "1"));
  let start;
  const gate = new Promise((go) => (start = go));
  await context.route("**/js/main.js", async (route) => {
    await gate;
    await route.continue();
  });
  const page = await context.newPage();
  page.problems = [];
  page.on("pageerror", (e) => page.problems.push("pageerror: " + e.message));
  await page.goto(env.url + "/", { waitUntil: "commit" });
  // Styled and in its own type, with no app yet.
  await page.waitForFunction(() => document.getElementById("toStation") && document.querySelector(".envelope")?.getBoundingClientRect().height > 100);
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => "kuvert" in window), false, "the app has not started");
  return {
    context,
    page,
    start: async () => {
      start();
      await page.waitForFunction(() => window.kuvert?.app);
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    },
  };
}
const SCREEN = { title: "#tonightTitle", horse: "#hast", dial: ".nixie", envelope: ".envelope", filters: ".pref-bar", button: "#drawBtn", count: "#eligibleCount", station: "#toStation" };
const places = (page) =>
  page.evaluate((SCREEN) => Object.fromEntries(Object.entries(SCREEN).map(([name, selector]) => [name, (({ top, height }) => Math.round(top) + "+" + Math.round(height))(document.querySelector(selector).getBoundingClientRect())])), SCREEN);

test("the first screen is where it will stay before the app has started, on a first visit and on a return", async () => {
  for (const [width, height] of [[390, 844], [320, 568], [1280, 900]])
    for (const returning of [false, true]) {
      const { context, page, start } = await held({ width, height, returning });
      const before = await places(page);
      await start();
      assert.deepEqual(await places(page), before, width + " wide, " + (returning ? "returning" : "first visit"));
      // And it was a screen worth looking at: the button on it, under the envelope.
      assert.ok(parseInt(before.button) > parseInt(before.envelope) && parseInt(before.button) < height, JSON.stringify(before));
      assert.deepEqual(await problems(page), []);
      await context.close();
    }
});

test("a tap on the envelope's button before the app has started is kept, and opens the envelope when it has", async () => {
  const { context, page, start } = await held({ width: 390, height: 844, returning: false });
  await page.click("#drawBtn");
  // The button shows it heard, and can't be pressed twice.
  assert.deepEqual(await page.evaluate(() => [document.documentElement.dataset.early, getComputedStyle(document.getElementById("drawBtn")).pointerEvents]), ["draw", "none"]);
  await start();
  await page.waitForFunction(() => !window.kuvert.app.stage.busy && window.kuvert.app.stage.open);
  assert.deepEqual(await page.evaluate(() => [document.documentElement.dataset.early ?? null, !!window.kuvert.app.store.p.current, document.getElementById("ticket").hidden]), [null, true, false]);
  assert.deepEqual(await problems(page), []);
  await context.close();
  // Nothing tapped: nothing opens by itself, and later taps are the app's own business.
  const quiet = await held({ width: 390, height: 844, returning: true });
  await quiet.start();
  assert.deepEqual(await quiet.page.evaluate(() => [document.documentElement.dataset.early ?? null, window.kuvert.app.stage.open, window.kuvert.app.store.p.current]), [null, false, null]);
  await quiet.page.click("#drawBtn");
  await quiet.page.waitForFunction(() => !window.kuvert.app.stage.busy && window.kuvert.app.stage.open);
  assert.equal(await quiet.page.evaluate(() => document.documentElement.dataset.early ?? null), null);
  await quiet.context.close();
});
