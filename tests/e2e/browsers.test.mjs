// The same phone-sized smoke run in all three engines. CI installs Chromium, Firefox and WebKit; a local
// checkout may only have Chromium, so an engine that isn't installed is skipped there (never on CI).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium, firefox, webkit } from "playwright";
import { serve } from "../../tools/serve.mjs";
import { onTestDay } from "./day.mjs";

// A PNG of one red dot.
const RED_DOT = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

for (const [name, type] of Object.entries({ chromium, firefox, webkit })) {
  const installed = existsSync(type.executablePath());
  test(name + " mobile keyboard, draw, watched, journal and recovery smoke", { skip: !installed && !process.env.CI && name + " isn't installed here" }, async () => {
    const service = await serve();
    let browser;
    try {
      browser = await type.launch();
      const context = await onTestDay(await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", serviceWorkers: "block" }));
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
      await page.goto(service.url + "/");
      await page.waitForFunction(() => window.kuvert?.app);
      // A first visit: the envelope's own button starts it, and the welcome beneath it steps aside.
      assert.equal(await page.isVisible("#welcome"), true);
      await page.click("#drawBtn");
      await page.waitForSelector("#ticket:not([hidden])");
      await page.waitForSelector("#welcome", { state: "hidden" });
      await page.waitForFunction(() => !window.kuvert.app.stage.busy);
      await page.click("#markBtn");
      await page.waitForSelector("#watchedPanel:not([hidden])");
      await page.evaluate(() => window.kuvert.app.router.show("journeys"));
      assert.equal(await page.locator(".collection-card:not(.gala-card, .award-card)").count(), 5);
      assert.equal(await page.locator(".award-card").count(), 1);
      assert.equal(await page.locator(".gala-card").count(), 1);
      const wide = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width && r.right > innerWidth + 1) out.push(el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + "." + [...el.classList].join(".") + " " + Math.round(r.right));
        }
        return { scroll: document.documentElement.scrollWidth, width: innerWidth, out: out.slice(0, 6) };
      });
      assert.ok(wide.scroll <= wide.width, "nothing pushes the page sideways: " + JSON.stringify(wide));
      await page.evaluate(() => window.kuvert.app.router.show("stats"));
      await page.click("#openPassport");
      await page.keyboard.press("Escape");
      // Escape closes it at once; its fade-out takes a moment longer.
      assert.equal(await page.evaluate(() => document.getElementById("passportDialog").open), false);
      await page.waitForSelector("#passportDialog", { state: "hidden" });
      await page.evaluate(() => window.kuvert.app.router.show("settings"));
      const download = page.waitForEvent("download");
      await page.click("#saveLibrary");
      assert.equal((await download).suggestedFilename(), "kuvert-library.json");
      await page.reload();
      await page.waitForFunction(() => window.kuvert?.app?.store.p.seen.size === 1);
      await page.evaluate(() => window.kuvert.app.router.show("journeys"));
      if (process.env.KUVERT_SCREENSHOT_DIR) await page.screenshot({ path: process.env.KUVERT_SCREENSHOT_DIR + "/kuvert-" + name + "-mobile.png", fullPage: true });
      // The bar with a long tally: beside the name the cheer steps aside and the name stays whole; on Tonight,
      // where the bar has no name in it, the cheer is back on the line.
      await page.evaluate(() => window.kuvert.app.catalog.films.slice(0, 112).forEach((f) => window.kuvert.app.store.markSeen(f.id, true)));
      await page.waitForFunction(() => /^11\d of /.test(document.getElementById("tally").textContent));
      await page.evaluate(() => document.fonts.ready);
      const bar = async (where) => {
        await page.evaluate((w) => window.kuvert.app.router.show(w), where);
        await page.waitForFunction(() => document.getAnimations().every((a) => a.constructor.name !== "CSSTransition" || a.playState !== "running"));
        return page.evaluate(() => {
          const box = (sel) => document.querySelector(sel).getBoundingClientRect(),
            nameEl = document.querySelector(".brand-name"),
            tally = box("#tally"),
            count = box(".tally-count"),
            cheer = box("#tally .cheer");
          return {
            // A pixel of slack: the engines round a text's width and its box differently.
            name: !nameEl.clientWidth ? "hidden" : nameEl.scrollWidth <= nameEl.clientWidth + 1 ? "whole" : "cut",
            count: count.left >= tally.left - 1 && count.right <= innerWidth && count.bottom > tally.top && count.top < tally.bottom ? "shown" : "cut",
            cheer: cheer.top >= tally.bottom - 1 ? "aside" : cheer.right <= tally.right + 1 && (cheer.top + cheer.bottom) / 2 < tally.bottom ? "shown" : "cut",
          };
        });
      };
      assert.deepEqual(await bar("library"), { name: "whole", count: "shown", cheer: "aside" });
      assert.deepEqual(await bar("tonight"), { name: "hidden", count: "shown", cheer: "shown" });
      // The pictures to share use the canvas's finer tools (lines laid through a matrix, holes cut out of a
      // stamp, a poster read for its colours): every engine draws the engraving and the stamps. One film
      // has a poster here, a single red dot served in TMDB's place.
      await context.route("https://image.tmdb.org/**/smoke.png*", (route) => route.fulfill({ status: 200, contentType: "image/png", headers: { "access-control-allow-origin": "*" }, body: Buffer.from(RED_DOT, "base64") }));
      const pictures = await page.evaluate(async () => {
        const { share, catalog, store } = window.kuvert.app,
          { rankedFilms } = await import("./js/state/stats.js");
        const film = catalog.films[0];
        store.recordDetails(film.id, { posterPath: "/smoke.png" });
        store.rate(film.id, 4);
        const light = (data, i) => data[i] + data[i + 1] + data[i + 2];
        // The ticket: ink in the strip under its head, where the engraved band runs.
        const ticket = await share.ticketCanvas(film),
          band = ticket.getContext("2d").getImageData(146, 262, 788, 28).data;
        let ink = 0;
        for (let i = 0; i < band.length; i += 4) if (light(band, 0) - light(band, i) > 90) ink++;
        // The ranking: its first stamp, a hole at the corner and paper beside the poster, which is red.
        const ranking = await share.rankingCanvas(),
          stamps = Math.min(3, rankedFilms(store.p, catalog).length),
          x = (1080 - stamps * 280 - (stamps - 1) * 40) / 2,
          at = (dx, dy) => [...ranking.getContext("2d").getImageData(x + dx, 374 + dy, 1, 1).data];
        const [hole, paper, poster] = [at(0, 0), at(9, 222), at(140, 260)];
        return { ticket: [ticket.width, ticket.height], engraved: ink > 500, hole: light(hole, 0) < 200, paper: light(paper, 0) > 600, poster: poster[0] > 200 && poster[1] < 60 && poster[2] < 60 };
      });
      assert.deepEqual(pictures, { ticket: [1080, 1350], engraved: true, hole: true, paper: true, poster: true });
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await browser?.close();
      service.server.closeAllConnections?.();
      service.server.close();
    }
  });
}
