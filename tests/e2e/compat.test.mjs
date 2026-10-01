// Both apps, one browser profile: each reads what the other wrote, through the browser save and codes.
// The unit tests prove the formats byte for byte; these prove it with the real pages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newContext, openPage, go, problems, nextProgress, classicProgress } from "./helpers.mjs";

// In the classic app (runs in its page): a small watchthrough through its own globals.
function classicWatch(n) {
  const ids = FILMS.map((f) => f.id).slice(10, 10 + n);
  ids.forEach((id, i) => {
    seen.add(id);
    dates[id] = "2026-03-" + String(1 + i).padStart(2, "0");
    if (i % 2 === 0) reviews[id] = { note: i ? "" : "Åh, vilken film.", rating: 1 + (i % 4) + 0.5 };
  });
  rankings = ids.slice(0, 3);
  skipped = new Set([FILMS[40].id]);
  persistBrowser();
  return ids;
}

test("the rebuild reads the classic app's save, and the classic app reads it back", async () => {
  const context = await newContext();
  const classic = await openPage(context, "/classic/");
  await classic.evaluate(classicWatch, 6);
  const written = await classicProgress(classic);

  const page = await openPage(context, "/");
  const read = await nextProgress(page);
  for (const k of ["seen", "dates", "reviews", "skipped", "rankings"]) assert.deepEqual(read[k], written[k], k);

  // One more film in the rebuild (its save now carries the new sync stamps).
  const extra = await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    const f = catalog.films[100];
    store.markSeen(f.id, true);
    store.rate(f.id, 4.5);
    return f.id;
  });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kuvert:v4")));
  assert.ok(saved.stamps?.[extra], "the rebuild stamps the change");

  await go(classic, "/classic/");
  const back = await classicProgress(classic);
  assert.ok(back.seen.includes(extra));
  assert.equal(back.reviews[extra].rating, 4.5);
  for (const id of written.seen) assert.ok(back.seen.includes(id));

  // The classic app saves over it (dropping stamps it doesn't know); the rebuild still reads it all.
  await classic.evaluate(() => persistBrowser());
  await go(page, "/");
  assert.deepEqual((await nextProgress(page)).seen, back.seen);
  assert.deepEqual([...(await problems(classic)), ...(await problems(page))], []);
  await context.close();
});

test("a save from before the last 25 films were added opens in both apps with nothing lost", async () => {
  // Written by Kuvert Classic on the previous catalogue, the day before the films were added.
  const before = JSON.parse(readFileSync(new URL("../fixtures/save-before-final-25.json", import.meta.url), "utf8"));
  const context = await newContext();
  await context.addInitScript((save) => {
    if (!localStorage.getItem("test:seeded")) localStorage.setItem("kuvert:v4", save), localStorage.setItem("test:seeded", "1");
  }, JSON.stringify(before));
  const expect = { seen: [...before.seen].sort(), dates: before.dates, rankings: before.rankings, current: before.current, skipped: [...before.skipped].sort() };
  const same = (read, who) => {
    for (const k of Object.keys(expect)) assert.deepEqual(read[k], expect[k], who + ": " + k);
  };

  const page = await openPage(context, "/");
  same(await nextProgress(page), "Kuvert");
  assert.equal(await page.isVisible("#unreadable"), false, "the save reads cleanly");
  const classic = await openPage(context, "/classic/");
  same(await classicProgress(classic), "Kuvert Classic");

  // One of the new films, watched in the new app, is read back by Classic with everything else.
  await page.evaluate(() => window.kuvert.app.store.markSeen("1988-die-hard", true));
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kuvert:v4")));
  assert.equal(saved.catalogue, "kuvert-2026-10-v9");
  await go(classic, "/classic/");
  const back = await classicProgress(classic);
  assert.deepEqual(back.seen, [...expect.seen, "1988-die-hard"].sort());
  assert.deepEqual([...(await problems(classic)), ...(await problems(page))], []);
  await context.close();
});

test("codes work in both directions", async () => {
  const one = await newContext();
  const classic = await openPage(one, "/classic/");
  await classic.evaluate(classicWatch, 9);
  const classicCode = await classic.evaluate(() => encode());
  const want = await classicProgress(classic);

  // A classic code, pasted into the rebuild.
  const two = await newContext();
  const page = await openPage(two, "/#settings");
  await page.click("text=Recovery & reset");
  await page.click("#loadCode");
  await page.fill("#codeInput", classicCode);
  await page.click("#codeRestore");
  await page.waitForSelector("#restoreDialog[open]");
  await page.click("#replaceProgress");
  await page.waitForFunction((n) => window.kuvert.app.store.p.seen.size === n, want.seen.length);
  const got = await nextProgress(page);
  for (const k of ["seen", "dates", "reviews", "skipped", "rankings"]) assert.deepEqual(got[k], want[k], k);

  // The rebuild's code, parsed by the classic app.
  await page.evaluate(() => window.kuvert.app.store.markSeen(window.kuvert.app.catalog.films[200].id, true));
  // The code on the page keeps up with the progress.
  await page.waitForFunction(() => document.getElementById("code").value === window.kuvert.app.store.code(), null, { timeout: 3000 });
  const nextCode = await page.inputValue("#code");
  assert.match(nextCode, /^KU7\./);
  const parsed = await classic.evaluate((code) => {
    const d = parseCode(code);
    return { seen: [...d.seen].sort(), reviews: d.reviews };
  }, nextCode);
  assert.deepEqual(parsed.seen, (await nextProgress(page)).seen);
  assert.deepEqual(parsed.reviews, got.reviews);
  assert.deepEqual([...(await problems(classic)), ...(await problems(page))], []);
  await one.close();
  await two.close();
});

test("an old envelope:v1 save is migrated the same way by both apps", async () => {
  const legacy = async (path) => {
    const context = await newContext();
    const page = await context.newPage();
    await page.goto((await import("./helpers.mjs")).env.url + "/tools/blank.html");
    // What the very first version of the app kept: a list of watched ids and a current pick.
    await page.evaluate(() => localStorage.setItem("envelope:v1", JSON.stringify({ seen: ["1941-citizen-kane", "1942-casablanca"], current: "1939-gone-with-the-wind" })));
    await go(page, path);
    const out = !path.startsWith("/classic/") ? await nextProgress(page) : await classicProgress(page);
    const keys = await page.evaluate(() => Object.keys(localStorage).sort());
    await context.close();
    return { seen: out.seen, current: out.current, keys };
  };
  const [a, b] = [await legacy("/classic/"), await legacy("/")];
  assert.deepEqual(b.seen, a.seen);
  assert.equal(b.current, a.current);
});
