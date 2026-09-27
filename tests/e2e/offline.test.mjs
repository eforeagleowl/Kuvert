// Offline, for real: the server goes away and both apps must still start, each from its own worker
// and cache. And the upgrade your devices go through: the old layout (Kuvert Classic at the root,
// the rebuild in /next/) replaced by the new one (Kuvert at the root, Classic in /classic/).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve } from "../../tools/serve.mjs";

const REPO = fileURLToPath(new URL("../..", import.meta.url));
// The first release of the rebuild, when it lived in /next/ (pull request #1).
const OLD_LAYOUT = "b346c2e38ce8ce839aacbaf5536efdd921839dac";

async function browse(server) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ serviceWorkers: "allow" });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Console errors too (a Trusted Types refusal to register the worker only shows up there).
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource|net::ERR/.test(m.text()) && errors.push(m.text()));
  const close = async () => {
    await browser.close();
    server.closeAllConnections?.();
    server.close();
  };
  return { page, errors, close };
}
// page.waitForFunction treats a returned Promise as truthy, so async checks poll through evaluate.
async function until(page, fn, arg, timeout = 15000) {
  const end = Date.now() + timeout;
  for (;;) {
    if (await page.evaluate(fn, arg).catch(() => false)) return;
    if (Date.now() > end) throw new Error("Timed out waiting for: " + fn.toString().slice(0, 160));
    await page.waitForTimeout(150);
  }
}
const newApp = (page) => page.waitForFunction(() => window.kuvert?.app, null, { timeout: 8000 });
const classicApp = (page) => page.waitForFunction(() => typeof encode === "function" && document.readyState === "complete", null, { timeout: 8000 });
// Waits until the page at `url` is controlled by the worker whose script is `script`.
async function controlledBy(page, script) {
  await until(page, async (script) => {
    const reg = await navigator.serviceWorker.getRegistration(location.href);
    return reg?.active?.state === "activated" && reg.active.scriptURL.endsWith(script);
  }, script);
  await page.reload();
  await page.waitForFunction((script) => navigator.serviceWorker.controller?.scriptURL.endsWith(script), script);
}
async function unplug(server) {
  server.closeAllConnections();
  await new Promise((r) => server.close(r));
}

test("both apps start offline after one visit, each from its own cache", async () => {
  const { server, url } = await serve();
  const { page, errors, close } = await browse(server);
  try {
    await page.goto(url + "/classic/");
    await classicApp(page);
    await controlledBy(page, "/classic/sw.js");
    await page.goto(url + "/");
    await newApp(page);
    await controlledBy(page, "/sw.js");
    const cached = await page.evaluate(async () => (await caches.keys()).sort());
    assert.ok(cached.some((k) => k.startsWith("kvapp-") && k !== "kvapp-posters"), cached.join());
    assert.ok(cached.includes("kuvert-classic-1"), cached.join());

    await unplug(server);

    await page.goto(url + "/");
    await newApp(page);
    assert.equal(await page.evaluate(() => document.fonts.check("16px Geist")), true, "fonts come from the cache");
    await page.click("#drawBtn");
    await page.waitForSelector("#ticket:not([hidden])");

    await page.goto(url + "/classic/");
    await classicApp(page);
    assert.equal(await page.evaluate(() => !!window.kuvert), false, "the classic page, not the new one");
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test("upgrading from the old layout keeps your progress and moves everyone to the main address", async () => {
  // The old layout, exactly as it was published.
  const old = mkdtempSync(join(tmpdir(), "kuvert-old-"));
  try {
    execFileSync("sh", ["-c", `git -C "${REPO}" archive ${OLD_LAYOUT} | tar -x -C "${old}"`]);
  } catch {
    rmSync(old, { recursive: true, force: true });
    throw new Error(`Commit ${OLD_LAYOUT} isn't in this clone. Fetch the full history (CI checks out with fetch-depth: 0).`);
  }
  const { server, url, setRoot } = await serve(0, { root: old });
  const { page, errors, close } = await browse(server);
  try {
    // Before: films watched in Kuvert Classic at the root, and the rebuild visited once at /next/.
    await page.goto(url + "/");
    await classicApp(page);
    const watched = await page.evaluate(() => {
      const ids = FILMS.map((f) => f.id).slice(20, 27);
      ids.forEach((id, i) => {
        seen.add(id);
        dates[id] = "2026-05-0" + (i + 1);
      });
      persistBrowser();
      return ids.sort();
    });
    await controlledBy(page, "/sw.js");
    await page.goto(url + "/next/");
    await newApp(page);
    await controlledBy(page, "/next/sw.js");

    // The new layout goes live.
    setRoot(REPO);

    // The main address now opens the new app, with the same progress, under the new worker.
    await page.goto(url + "/");
    await newApp(page);
    assert.deepEqual(await page.evaluate(() => [...window.kuvert.app.store.p.seen].sort()), watched);
    await until(page, async () => {
      const keys = await caches.keys();
      return keys.some((k) => k.startsWith("kvapp-")) && !keys.some((k) => /^kuvert-[0-9a-f]{10}$/.test(k));
    });

    // /next/ forwards to the main address, keeping the page you asked for, and its worker leaves.
    await page.goto(url + "/next/#stats");
    await page.waitForURL(url + "/#stats");
    await newApp(page);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.page), "stats");
    await until(page, async () => !(await navigator.serviceWorker.getRegistrations()).some((r) => r.scope.endsWith("/next/")));

    // Kuvert Classic, at its new address, reads the same progress.
    await page.goto(url + "/classic/");
    await classicApp(page);
    assert.deepEqual(await page.evaluate(() => [...seen].sort()), watched);
    await controlledBy(page, "/classic/sw.js");


    // And both work offline.
    await unplug(server);
    await page.goto(url + "/");
    await newApp(page);
    assert.equal(await page.evaluate(() => window.kuvert.app.store.p.seen.size), watched.length);
    await page.goto(url + "/classic/");
    await classicApp(page);
    assert.deepEqual(errors, []);
  } finally {
    await close();
    rmSync(old, { recursive: true, force: true });
  }
});
