// Offline, for real: the server goes away and Kuvert must still start from its own worker and cache.
// And the moves your devices went through: the old layout (Kuvert Classic at the root, the rebuild in
// /next/) replaced by Kuvert at the root, and then Kuvert Classic retiring from /classic/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve } from "../../tools/serve.mjs";

const REPO = fileURLToPath(new URL("../..", import.meta.url));
// The first release of the rebuild, when it lived in /next/ (pull request #1).
const OLD_LAYOUT = "b346c2e38ce8ce839aacbaf5536efdd921839dac";
// The last release with Kuvert Classic at /classic/ (pull request #13).
const WITH_CLASSIC = "9db6b5c2f6fea0ebf7928bd574d872d764d05872";
// The last release whose worker fetched the page fresh and took its scripts from the cache (pull request #23).
const FRESH_PAGES = "2702a6059b54225ffb7f317ec185996346b0bf7e";

// A published version of the site, exactly as it was, in a folder of its own.
function checkout(commit) {
  const dir = mkdtempSync(join(tmpdir(), "kuvert-old-"));
  try {
    execFileSync("sh", ["-c", `git -C "${REPO}" archive ${commit} | tar -x -C "${dir}"`]);
  } catch {
    rmSync(dir, { recursive: true, force: true });
    throw new Error(`Commit ${commit} isn't in this clone. Fetch the full history (CI checks out with fetch-depth: 0).`);
  }
  return dir;
}

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

test("Kuvert starts offline after one visit", async () => {
  const { server, url } = await serve();
  const { page, errors, close } = await browse(server);
  try {
    await page.goto(url + "/");
    await newApp(page);
    await controlledBy(page, "/sw.js");
    const cached = await page.evaluate(async () => (await caches.keys()).sort());
    assert.ok(cached.some((k) => k.startsWith("kvapp-") && !k.startsWith("kvapp-posters")), cached.join());

    await unplug(server);

    await page.goto(url + "/");
    await newApp(page);
    assert.equal(await page.evaluate(() => document.fonts.check("16px Geist")), true, "fonts come from the cache");
    await page.click("#drawBtn");
    await page.waitForSelector("#ticket:not([hidden])");
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test("upgrading from the old layout keeps your progress and moves everyone to the main address", async () => {
  // The old layout, exactly as it was published.
  const old = checkout(OLD_LAYOUT);
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

    // Kuvert Classic's address forwards there too.
    await page.goto(url + "/classic/#stats");
    await page.waitForURL(url + "/#stats");
    await newApp(page);

    // And it works offline.
    await unplug(server);
    await page.goto(url + "/");
    await newApp(page);
    assert.equal(await page.evaluate(() => window.kuvert.app.store.p.seen.size), watched.length);
    assert.deepEqual(errors, []);
  } finally {
    await close();
    rmSync(old, { recursive: true, force: true });
  }
});

test("Kuvert Classic retires: its address forwards to Kuvert with your progress, and its worker leaves", async () => {
  const before = checkout(WITH_CLASSIC);
  const { server, url, setRoot } = await serve(0, { root: before });
  const { page, errors, close } = await browse(server);
  try {
    // Before: Kuvert Classic installed at /classic/, with films watched in it.
    await page.goto(url + "/classic/");
    await classicApp(page);
    const watched = await page.evaluate(() => {
      const ids = FILMS.map((f) => f.id).slice(40, 46);
      ids.forEach((id) => seen.add(id));
      persistBrowser();
      return ids.sort();
    });
    await controlledBy(page, "/classic/sw.js");
    assert.ok((await page.evaluate(() => caches.keys())).includes("kuvert-classic-1"));

    // Classic retires.
    setRoot(REPO);

    // Its address opens Kuvert, on the page you asked for, with the same progress.
    await page.goto("about:blank");
    await page.goto(url + "/classic/#library");
    await page.waitForURL(url + "/#library");
    await newApp(page);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.page), "library");
    assert.deepEqual(await page.evaluate(() => [...window.kuvert.app.store.p.seen].sort()), watched);
    // Classic's worker and what it kept are gone.
    await until(page, async () => {
      const regs = await navigator.serviceWorker.getRegistrations();
      return !regs.some((r) => r.scope.endsWith("/classic/")) && !(await caches.keys()).some((k) => k.startsWith("kuvert-classic-"));
    });
    assert.deepEqual(errors, []);
  } finally {
    await close();
    rmSync(before, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- releases
// A release, without touching the repo: the page and the worker change (and with them the version).
function release(files) {
  files["/index.html"] = readFileSync(join(REPO, "index.html"), "utf8").replace("<html ", '<html data-release="next" ');
  files["/sw.js"] = readFileSync(join(REPO, "sw.js"), "utf8").replace(/const VERSION = "[0-9a-f]+"/, 'const VERSION = "0123456789ab"');
}
// Every page this tab has loaded, by release: kept across reloads.
const LOADS = () =>
  addEventListener("DOMContentLoaded", () => {
    const loads = JSON.parse(sessionStorage.getItem("test:loads") || "[]");
    sessionStorage.setItem("test:loads", JSON.stringify([...loads, document.documentElement.dataset.release || "current"]));
  });
const loads = (page) => page.evaluate(() => JSON.parse(sessionStorage.getItem("test:loads")));
const onNext = (page) => page.waitForFunction(() => document.documentElement.dataset.release === "next" && window.kuvert?.app, null, { timeout: 20000 });
const appCaches = (page) => page.evaluate(async () => (await caches.keys()).filter((k) => k.startsWith("kvapp-") && !k.startsWith("kvapp-posters")));

test("a release: Kuvert opens on the version the device has, then starts again on the new one", async () => {
  const files = {};
  const { server, url } = await serve(0, { files });
  const { page, errors, close } = await browse(server);
  try {
    await page.addInitScript(LOADS);
    await page.goto(url + "/");
    await newApp(page);
    await controlledBy(page, "/sw.js");
    await newApp(page);
    await page.waitForLoadState("networkidle");

    release(files);

    // The page comes from the same version as its scripts: never a new page on old scripts.
    await page.goto(url + "/");
    // Nothing was touched, so it starts again on the new version by itself.
    await onNext(page);
    assert.deepEqual(await loads(page), ["current", "current", "current", "next"]);
    assert.deepEqual(await appCaches(page), ["kvapp-0123456789ab"], "the version before is gone");
    await page.click("#drawBtn");
    await page.waitForSelector("#ticket:not([hidden])");
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test("a release while Kuvert is in use: it says so and waits for Reload", async () => {
  const files = {};
  const { server, url } = await serve(0, { files });
  const { page, errors, close } = await browse(server);
  try {
    await page.addInitScript(LOADS);
    await page.goto(url + "/");
    await newApp(page);
    await controlledBy(page, "/sw.js");
    await newApp(page);
    await page.waitForLoadState("networkidle");
    await page.click("#drawBtn");
    await page.waitForSelector("#ticket:not([hidden])");
    const film = await page.evaluate(() => window.kuvert.app.store.p.current);

    release(files);
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((reg) => reg.update()));

    await page.waitForSelector("#toast:not([hidden])");
    assert.equal(await page.textContent("#toastText"), "A new version of Kuvert is ready.");
    assert.deepEqual(await loads(page), ["current", "current"], "the open ticket is left alone");
    await page.click("#toastAction");
    await onNext(page);
    assert.equal(await page.evaluate(() => window.kuvert.app.store.p.current), film, "tonight's film is still on the ticket");
    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});

test("a release that the cached scripts can't run (devices coming from older workers): Kuvert restarts itself", async () => {
  // The release before, exactly as published, except that its scripts refuse any later page: the
  // way #22's scripts stopped dead on #23's page. Its worker fetches pages fresh, so that is what it gets.
  const before = checkout(FRESH_PAGES);
  const REFUSES = "these scripts are older than their page";
  const files = { "/js/main.js": `if (document.querySelector('script[src="js/update.js"]')) throw new Error("${REFUSES}");\n` + readFileSync(join(before, "js", "main.js"), "utf8") };
  const { server, url, setRoot } = await serve(0, { root: before, files });
  const { page, errors, close } = await browse(server);
  try {
    await page.goto(url + "/");
    await newApp(page);
    await page.evaluate(() => {
      const { store, catalog } = window.kuvert.app;
      store.markSeen(catalog.films[3].id, true);
    });
    await controlledBy(page, "/sw.js");
    await newApp(page);
    await page.waitForLoadState("networkidle");

    setRoot(REPO);
    delete files["/js/main.js"];

    // The new page arrives with the old scripts, which stop. Once the new version has taken over,
    // the page starts again on it: nobody has to find the reload button.
    await page.goto(url + "/");
    await page.waitForFunction(() => window.kuvert?.app && document.querySelector('script[src="js/update.js"]'), null, { timeout: 20000 });
    const { version } = await import("../../tools/stamp.mjs").then((m) => m.stamp());
    assert.deepEqual(await appCaches(page), ["kvapp-" + version]);
    assert.equal(await page.evaluate(() => window.kuvert.app.store.p.seen.size), 1, "progress is untouched");
    await page.click("#drawBtn");
    await page.waitForSelector("#ticket:not([hidden])");
    assert.deepEqual(errors.filter((e) => !e.includes(REFUSES)), []);
    assert.ok(errors.length <= 1, "the old scripts stopped once, on the one page they couldn't run");
  } finally {
    await close();
    rmSync(before, { recursive: true, force: true });
  }
});
