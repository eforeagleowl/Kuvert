// Separate browser profiles coordinate against the actual optional HTTP backend.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright";
import { serveClub } from "../../server/server.mjs";

let service, browser, dir;
before(async () => {
  dir = await mkdtemp(join(tmpdir(), "kuvert-club-browser-"));
  service = await serveClub({ dataFile: join(dir, "rooms.json") });
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  await service?.close();
  await rm(dir, { recursive: true, force: true });
});
async function pageFor(t, viewport = { width: 1280, height: 900 }, path = "/#club") {
  const context = await browser.newContext({ serviceWorkers: "block", viewport, reducedMotion: "reduce" });
  t.after(() => context.close());
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  await context.addInitScript(() => {
    localStorage.setItem("kuvert:welcomed", "1");
    window.__clubProblems = [];
    document.addEventListener("securitypolicyviolation", (event) => window.__clubProblems.push("CSP: " + event.violatedDirective));
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => { page.problems.push(error.message); });
  page.on("console", (message) => { if (message.type() === "error" && !/net::ERR_FAILED|Failed to load resource/.test(message.text())) page.problems.push(message.text()); });
  page.problems = [];
  await page.goto(service.url + path);
  await page.waitForFunction(() => window.kuvert?.app?.club?.available === true);
  return page;
}
async function state(page, expected) {
  await page.waitForFunction((wanted) => window.kuvert.app.club.client.room?.sessions.at(-1)?.state === wanted, expected);
}
async function refresh(page) {
  await page.getByRole("button", { name: "Refresh club", exact: true }).click();
  await page.waitForFunction(() => !window.kuvert.app.club.refreshing);
}
async function assertHealthy(page) {
  assert.deepEqual(page.problems, []);
  assert.deepEqual(await page.evaluate(() => window.__clubProblems), []);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "club fits the viewport without horizontal scrolling");
}

test("two profiles create and join a club, agree, reveal private ratings, retain access, export and leave", async (t) => {
  const host = await pageFor(t);
  await host.locator("#clubMemberName").fill("Anna");
  await host.locator("#clubRoomName").fill("Fredagsfilm och fika");
  await host.getByRole("button", { name: "Create private club", exact: true }).click();
  await host.waitForSelector(".club-room");
  await host.getByRole("button", { name: "Invite friends", exact: true }).click();
  await host.waitForSelector("#journeyDialog[open]");
  const invite = await host.locator("#journeyContent textarea").inputValue();
  const hostSecret = await host.evaluate(() => window.kuvert.app.club.client.credential.memberToken);
  assert.ok(!invite.includes(hostSecret), "invitation shares guest access only");
  assert.ok(invite.includes("#club="));
  await host.locator("#journeyClose").click();

  const guest = await pageFor(t, { width: 390, height: 844 }, new URL(invite).pathname + new URL(invite).hash);
  assert.ok((await guest.locator("#clubInviteCode").inputValue()).length > 30);
  await guest.locator("#clubMemberName").fill("Bo");
  await guest.getByRole("button", { name: "Join club", exact: true }).click();
  await guest.waitForSelector(".club-room");
  await refresh(host);
  assert.match(await host.locator(".club-members").innerText(), /Bo/);
  assert.equal(await guest.getByRole("button", { name: "Propose this film", exact: true }).count(), 0, "guests cannot choose the club's film");

  const chosen = await host.locator("#clubFilmChoice").inputValue();
  await host.getByRole("button", { name: "Propose this film", exact: true }).click();
  await state(host, "proposed");
  assert.equal(await host.evaluate(() => window.kuvert.app.club.client.room.sessions.at(-1).filmId), chosen);
  await refresh(guest);
  await guest.getByRole("button", { name: "I’m in", exact: true }).click();
  await state(guest, "watching");
  await refresh(host);
  await state(host, "watching");

  await host.getByLabel("Your private rating", { exact: true }).selectOption("4.5");
  await host.getByLabel("Your note for the club", { exact: true }).fill("Anna's hidden verdict: beautifully strange.");
  await host.getByRole("button", { name: "Seal my rating", exact: true }).click();
  await host.waitForFunction(() => window.kuvert.app.club.client.room.sessions.at(-1).ownRating?.stars === 4.5);
  await refresh(guest);
  assert.ok(!(await guest.locator("#clubBody").innerText()).includes("Anna's hidden verdict"));
  assert.equal(await guest.evaluate(() => window.kuvert.app.club.client.room.sessions.at(-1).ratings), undefined);
  assert.equal(await guest.locator(".club-ratings").count(), 0);
  await guest.getByLabel("Your private rating", { exact: true }).selectOption("3.5");
  await guest.getByLabel("Your note for the club", { exact: true }).fill("A good one for the scrapbook.");
  await guest.getByRole("button", { name: "Seal my rating", exact: true }).click();
  await state(guest, "revealed");
  await refresh(host);
  await state(host, "revealed");
  assert.match(await guest.locator(".club-ratings").innerText(), /Anna.*4\.5/s);
  assert.match(await host.locator(".club-ratings").innerText(), /Bo.*3\.5/s);
  assert.match(await guest.locator(".club-ratings").innerText(), /Anna's hidden verdict/);

  const savedCredential = await guest.evaluate(() => JSON.parse(localStorage.getItem("kuvert:club:v1")).credential.memberToken);
  await guest.reload();
  await guest.waitForSelector(".club-room");
  assert.equal(await guest.evaluate(() => window.kuvert.app.club.client.credential.memberToken), savedCredential);
  assert.match(await guest.locator(".club-ratings").innerText(), /A good one for the scrapbook/);
  const downloaded = guest.waitForEvent("download");
  await guest.getByRole("button", { name: "Download scrapbook", exact: true }).click();
  const download = await downloaded;
  assert.equal(download.suggestedFilename(), "kuvert-club-scrapbook.json");
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(exported.sessions[0].ratings.length, 2);
  assert.ok(!JSON.stringify(exported).includes(hostSecret));
  await assertHealthy(host);
  await assertHealthy(guest);
  await guest.screenshot({ path: process.env.KUVERT_CLUB_SCREENSHOT || join(dir, "club-mobile.png"), fullPage: true });

  await guest.getByRole("button", { name: "Leave club", exact: true }).click();
  await guest.locator("#confirmYes").click();
  await guest.waitForSelector(".club-setup");
  assert.equal(await guest.evaluate(() => localStorage.getItem("kuvert:club:v1")), null);
  await refresh(host);
  assert.equal(await host.evaluate(() => window.kuvert.app.club.client.room.members.filter((m) => m.active).length), 1);
  await host.getByRole("button", { name: "Close club", exact: true }).click();
  await host.locator("#confirmYes").click();
  await host.waitForSelector(".club-setup");
  assert.equal(await host.evaluate(() => localStorage.getItem("kuvert:club:v1")), null);
  await assertHealthy(host);
  await assertHealthy(guest);
});
