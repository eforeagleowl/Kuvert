// The film club for a site that has no server of its own (GitHub Pages): the page on one address, pointed
// by tools/club-service.mjs at a club service on another, as it will be with Railway.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import { serve } from "../../tools/serve.mjs";
import { pointAt } from "../../tools/club-service.mjs";
import { serveClub } from "../../server/server.mjs";

let site, plain, service, browser, dir;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "kuvert-club-service-"));
  const files = {};
  site = await serve(0, { files });
  plain = await serve();
  // The club service lists the site it serves (KUVERT_CORS_ORIGINS on Railway).
  service = await serveClub({ dataFile: join(dir, "rooms.json"), corsOrigins: [site.url] });
  // The site as tools/club-service.mjs leaves it: the setting, and the address allowed in the page's policy.
  const pointed = pointAt(service.url, { service: await readFile(new URL("../../js/club/service.js", import.meta.url), "utf8"), html: await readFile(new URL("../../index.html", import.meta.url), "utf8") });
  Object.assign(files, { "/index.html": pointed.html, "/js/club/service.js": pointed.service });
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  await service?.close();
  site?.server.close();
  plain?.server.close();
  await rm(dir, { recursive: true, force: true });
});

async function open(t, path, from = site) {
  const context = await browser.newContext({ serviceWorkers: "block", viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  t.after(() => context.close());
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  await context.addInitScript(() => {
    localStorage.setItem("kuvert:welcomed", "1");
    window.__problems = [];
    document.addEventListener("securitypolicyviolation", (event) => window.__problems.push("CSP: " + event.violatedDirective + " " + event.blockedURI));
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => page.problems.push(error.message));
  page.problems = [];
  await page.goto(from.url + path);
  await page.waitForFunction(() => window.kuvert?.app);
  return page;
}

test("pointed at a club service elsewhere, the site finds it, and friends create and join a club through it", async (t) => {
  const host = await open(t, "/#club");
  await host.waitForFunction(() => window.kuvert.app.club.available === true);
  assert.equal(await host.evaluate(() => window.kuvert.app.club.client.endpoint), service.url);
  await host.locator("#clubMemberName").fill("Anna");
  await host.locator("#clubRoomName").fill("Fredagsfilm");
  await host.getByRole("button", { name: "Create private club", exact: true }).click();
  await host.waitForSelector(".club-room");
  await host.getByRole("button", { name: "Invite friends", exact: true }).click();
  await host.waitForSelector("#journeyDialog[open]");
  const invite = new URL(await host.locator("#journeyContent textarea").inputValue());
  assert.equal(invite.origin, site.url, "the invitation opens the site");
  assert.equal(new URLSearchParams(invite.hash.slice(1)).get("service"), service.url, "and names the club service");

  const guest = await open(t, invite.pathname + invite.hash);
  await guest.locator("#clubMemberName").fill("Bo");
  await guest.getByRole("button", { name: "Join club", exact: true }).click();
  await guest.waitForSelector(".club-room");
  await host.locator("#journeyClose").click();
  await host.getByRole("button", { name: "Refresh club", exact: true }).click();
  await host.waitForFunction(() => window.kuvert.app.club.client.room?.members.length === 2);
  for (const page of [host, guest]) {
    assert.deepEqual(page.problems, []);
    assert.deepEqual(await page.evaluate(() => window.__problems), []);
  }
});

test("not pointed anywhere, as the site ships today, the club stays hidden", async (t) => {
  const page = await open(t, "/#club", plain);
  await page.waitForFunction(() => window.kuvert.app.club.client.endpoint === "");
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => window.kuvert.app.club.available), false);
  assert.deepEqual(await page.evaluate(() => window.__problems), []);
});

test("a site the club service doesn't list is refused", async () => {
  const health = await fetch(service.url + "/api/health", { headers: { Origin: "https://someone-else.example" } });
  assert.equal(health.status, 403);
});
