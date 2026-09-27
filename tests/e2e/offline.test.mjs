// Offline, for real: both apps are visited once, then the server goes away and both must still start,
// each from its own worker and cache (the classic worker used to store every page as ./index.html).
import { test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { serve } from "../../tools/serve.mjs";

test("both apps start offline after one visit, each from its own cache", async () => {
  const { server, url } = await serve();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ serviceWorkers: "allow" });
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // Console errors too (a Trusted Types refusal to register the worker only shows up there).
    page.on("console", (m) => m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text()) && errors.push(m.text()));

    // The classic app first (its worker's scope covers /next/ too), then the rebuild.
    await page.goto(url + "/");
    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true));
    await page.goto(url + "/next/");
    await page.waitForFunction(() => window.kuvert?.app);
    // The rebuild registers its own worker, scoped to /next/, and it activates.
    await page.waitForFunction(async () => {
      const reg = await navigator.serviceWorker.getRegistration(location.href);
      return reg?.scope.endsWith("/next/") && reg.active?.state === "activated";
    });
    // Wait until the rebuild's worker controls the page and has everything precached.
    await page.reload();
    await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith("/next/sw.js"));
    const cached = await page.evaluate(async () => (await caches.keys()).sort());
    assert.ok(cached.some((k) => k.startsWith("kvnext-") && k !== "kvnext-posters"), cached.join());
    assert.ok(cached.some((k) => k.startsWith("kuvert-")), cached.join());

    // Pull the plug.
    server.closeAllConnections();
    await new Promise((r) => server.close(r));

    await page.goto(url + "/next/");
    await page.waitForFunction(() => window.kuvert?.app, null, { timeout: 5000 });
    assert.equal(await page.evaluate(() => document.fonts.check("16px Geist")), true, "fonts come from the cache");
    await page.click("#drawBtn");
    await page.waitForSelector("#ticket:not([hidden])");

    await page.goto(url + "/");
    await page.waitForFunction(() => typeof encode === "function", null, { timeout: 5000 });
    assert.equal(await page.evaluate(() => location.pathname), "/");
    assert.equal(await page.evaluate(() => !!document.querySelector("#page-tonight.page")), false, "the classic page, not the rebuild");
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser.close();
    server.closeAllConnections?.();
    server.close();
  }
});
