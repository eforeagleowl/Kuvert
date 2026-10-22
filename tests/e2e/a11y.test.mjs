// Accessibility: axe-core (WCAG 2.2 A and AA, plus its best practices) over every page and dialog, in
// English, Swedish, SEAGAL and Galan, on a phone and a desktop. The audit runs with the page's security
// policy bypassed so axe can be loaded; the other browser tests check that policy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { env, go } from "./helpers.mjs";

const AXE = readFileSync(new URL("../../node_modules/axe-core/axe.min.js", import.meta.url), "utf8");
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

/** Every finding, as "rule: where (why)". */
async function audit(page, include = null) {
  if (!(await page.evaluate(() => !!window.axe))) await page.evaluate(AXE);
  const { violations } = await page.evaluate(([inc, tags]) => window.axe.run(inc ? { include: [inc] } : document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations"] }), [include, TAGS]);
  return violations.flatMap((v) =>
    v.nodes
      // A row scrolled under the fixed tab bar or the sticky header counts as "obscured" at that scroll
      // position; the page leaves room to scroll every one of them clear.
      .filter((n) => !(v.id === "target-size" && /obscured/.test(n.any?.[0]?.message || "")))
      .map((n) => `${v.id}: ${n.target.join(" ")} (${(n.any?.[0] || n.all?.[0] || n.none?.[0])?.message || v.help})`),
  );
}

async function open(lang, mode, width) {
  const context = await env.browser.newContext({ viewport: { width, height: 844 }, serviceWorkers: "block", reducedMotion: "reduce", bypassCSP: true, isMobile: width < 500, hasTouch: width < 500 });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await context.addInitScript(([lang, mode]) => {
    localStorage.setItem("kuvert:welcomed", "1");
    localStorage.setItem("kuvert:lang", lang);
    if (mode === "seagal") localStorage.setItem("kuvert:mode", mode);
  }, [lang, mode]);
  const page = await context.newPage();
  await go(page, "/");
  if (mode === "gala") {
    await page.evaluate(() => window.kuvert.app.router.show("settings"));
    await Promise.all([page.waitForEvent("load"), page.click("#galaLink")]);
    await page.waitForFunction(() => window.kuvert?.app);
  }
  // Some history, so the Library, Stats and the calendar have something in them.
  await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    catalog.films.slice(10, 20).forEach((f, i) => {
      store.markSeen(f.id, true);
      store.rate(f.id, (i % 5) + 1);
    });
  });
  return { context, page };
}

for (const [lang, mode, width] of [
  ["en", "", 1280],
  ["sv", "", 390],
  ["en", "seagal", 390],
  ["sv", "gala", 1280],
]) {
  test(`every page passes axe: ${lang}${mode ? " " + mode : ""}, ${width}px`, async () => {
    const { context, page } = await open(lang, mode, width);
    const found = [];
    const check = async (where, include) => found.push(...(await audit(page, include)).map((f) => `${where} · ${f}`));
    await check("Tonight");
    await page.click("#drawBtn");
    await page.waitForFunction(() => !window.kuvert.app.stage.busy && window.kuvert.app.stage.open);
    await check("The ticket");
    for (const name of mode === "seagal" ? ["station", "library", "stats", "settings"] : ["station", "journeys", "library", "stats", "settings"]) {
      await page.evaluate((n) => window.kuvert.app.router.show(n), name);
      if (name === "library") await page.evaluate(() => (document.getElementById("watchedArchive").open = true));
      await page.waitForTimeout(400);
      await check(name);
      // The station's printed ticket too (Kuvert C's, Union Station's or the depot's).
      if (name === "station") {
        await page.waitForFunction(() => window.kuvert.app.station.fontsReady && !window.kuvert.app.station.busy);
        await page.click("#stDraw");
        await page.waitForFunction(() => !window.kuvert.app.station.busy && !document.getElementById("stTicket").hidden);
        await check("the station's ticket");
      }
    }
    if (!mode) {
      const film = await page.evaluate(() => window.kuvert.app.catalog.films[10].id);
      for (const [name, how] of [
        ["the date dialog", (id) => window.kuvert.app.dialogs.editDate(id)],
        ["the note dialog", (id) => window.kuvert.app.dialogs.editReview(id)],
        ["a confirmation", () => void window.kuvert.app.dialogs.confirm({ title: "Sure?", text: "Really.", confirm: "Yes" })],
      ]) {
        await page.evaluate(how, film);
        await check(name, "dialog[open]");
        await page.evaluate(() => document.querySelector("dialog[open]")?.close());
      }
      // The ones that hold their own markup.
      for (const id of ["restoreDialog", "groupDialog", "codeDialog", "lbxDialog", "listDialog", "moodDialog", "legacyDialog"]) {
        await page.evaluate((d) => document.getElementById(d).showModal(), id);
        await check(id, "#" + id);
        await page.evaluate((d) => document.getElementById(d).close(), id);
      }
      await page.evaluate(() => window.kuvert.app.router.show("journeys"));
      await page.locator("#curatedGrid .collection-card").last().locator("button").last().click();
      await page.waitForSelector("#journeyDialog[open]");
      await check("an envelope's preview", "#journeyDialog");
      await page.evaluate(() => document.getElementById("journeyDialog").close());
      await page.evaluate(() => window.kuvert.app.router.show("stats"));
      await page.click("#openPassport");
      await page.waitForSelector("#passportDialog[open] .passport");
      await check("the cinema passport", "#passportDialog");
      await page.evaluate(() => document.getElementById("passportDialog").close());
    }
    await context.close();
    assert.deepEqual(found, []);
  });
}

test("the watch-days calendar is one stop for Tab, and the arrow keys move between days", async () => {
  const { context, page } = await open("en", "", 1280);
  await page.evaluate(() => window.kuvert.app.router.show("stats"));
  await page.waitForSelector(".heat-cell");
  assert.equal(await page.locator('.heat-cell[tabindex="0"]').count(), 1, "one day takes the focus from Tab");
  const focused = () => page.evaluate(() => [...document.querySelectorAll(".heat-cell")].indexOf(document.activeElement));
  await page.focus('.heat-cell[tabindex="0"]');
  const today = await focused();
  await page.keyboard.press("ArrowLeft");
  assert.equal(await focused(), today - 7, "left: the same day a week earlier");
  await page.keyboard.press("ArrowUp");
  assert.equal(await focused(), today - 8, "up: the day before");
  await page.keyboard.press("Home");
  assert.equal(await focused(), 0);
  await page.keyboard.press("End");
  assert.equal(await focused(), today, "end: today, the last day there is");
  await page.keyboard.press("ArrowRight");
  assert.equal(await focused(), today, "nothing past today");
  await page.keyboard.press("Tab");
  assert.equal(await focused(), -1, "Tab leaves the calendar");
  await context.close();
});
