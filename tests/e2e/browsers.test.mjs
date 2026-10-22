// The same phone-sized smoke run in all three engines. CI installs Chromium, Firefox and WebKit; a local
// checkout may only have Chromium, so an engine that isn't installed is skipped there (never on CI).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium, firefox, webkit } from "playwright";
import { serve } from "../../tools/serve.mjs";

for (const [name, type] of Object.entries({ chromium, firefox, webkit })) {
  const installed = existsSync(type.executablePath());
  test(name + " mobile keyboard, draw, watched, journal and recovery smoke", { skip: !installed && !process.env.CI && name + " isn't installed here" }, async () => {
    const service = await serve();
    let browser;
    try {
      browser = await type.launch();
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", serviceWorkers: "block" });
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
      await page.goto(service.url + "/");
      await page.waitForFunction(() => window.kuvert?.app);
      await page.click("#welcomeStart");
      await page.waitForSelector("#ticket:not([hidden])");
      await page.waitForFunction(() => !window.kuvert.app.stage.busy);
      await page.click("#markBtn");
      await page.waitForSelector("#watchedPanel:not([hidden])");
      await page.evaluate(() => window.kuvert.app.router.show("journeys"));
      assert.equal(await page.locator(".collection-card").count(), 4);
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
      assert.deepEqual(errors, []);
      await context.close();
    } finally {
      await browser?.close();
      service.server.closeAllConnections?.();
      service.server.close();
    }
  });
}
