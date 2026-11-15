// Tonight after the UX round: the reveal on a phone, the next day's "Watched it", films seen before
// Kuvert, the share choice, where to watch, and the Home Screen hint.
import { test } from "node:test";
import assert from "node:assert/strict";
import { devices } from "playwright";
import { env, newContext, openPage, problems } from "./helpers.mjs";

const opened = (page) => page.waitForFunction(() => !window.kuvert.app.stage.busy && window.kuvert.app.stage.open);
// Tonight at rest: under reduced motion every change is a transition of a hundredth of a millisecond, and
// a box measured in the frame of the change still has its old size. No transition running, and the
// draw button in the same place two frames in a row.
const settled = (page) =>
  page.waitForFunction(
    () => {
      const idle = document.getAnimations().every((a) => a.constructor.name !== "CSSTransition" || a.playState !== "running");
      const top = document.getElementById("drawBtn").getBoundingClientRect().top;
      const same = window.__drawTop === top;
      window.__drawTop = top;
      return idle && same;
    },
    null,
    { polling: "raf", timeout: 5000 },
  );

async function phone({ welcomed = true } = {}) {
  const context = await env.browser.newContext({ ...devices["iPhone 13"], serviceWorkers: "block", reducedMotion: "reduce" });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await context.addInitScript((welcomed) => {
    window.__problems = [];
    document.addEventListener("securitypolicyviolation", (e) => window.__problems.push("CSP: " + e.violatedDirective));
    if (welcomed) localStorage.setItem("kuvert:welcomed", "1");
  }, welcomed);
  return context;
}

test("on a phone, a returning visitor sees the envelope and its button, and the draw lands the title on screen", async () => {
  const context = await phone();
  const page = await openPage(context, "/");
  await settled(page);
  const box = (sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().toJSON(), sel);
  const tabs = await box(".tabbar");
  assert.ok((await box("#drawBtn")).bottom <= tabs.top, "the draw button clears the tab bar");
  assert.equal(await page.textContent("#drawBtn"), "Öppna kuvertetOpen the envelope", "English under the Swedish");
  assert.match(await page.textContent("#eligibleCount"), /^\d+ films left in the envelope$/);
  await page.click("#drawBtn");
  await opened(page);
  const title = await box("#pickTitle");
  assert.ok(title.top >= (await box(".appbar")).bottom && title.bottom <= tabs.top, "the film's title is on screen");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("on a laptop, a returning visitor sees the envelope and its button without scrolling", async () => {
  // What's left of common laptop screens under the browser's own bars.
  for (const viewport of [{ width: 1366, height: 657 }, { width: 1280, height: 720 }, { width: 1440, height: 789 }]) {
    const context = await newContext({ viewport });
    const page = await openPage(context, "/");
    await settled(page);
    const size = viewport.width + "x" + viewport.height;
    const box = (sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().toJSON(), sel);
    const env = await box("#envelope");
    assert.ok(env.top >= (await box(".appbar")).bottom && env.width >= 320, "the envelope, whole, under the app bar (" + size + ")");
    assert.ok((await box("#drawBtn")).bottom <= viewport.height, "the draw button (" + size + ")");
    assert.ok((await box("#eligibleCount")).bottom <= viewport.height, "and the count under it (" + size + ")");
    assert.equal(await page.evaluate(() => scrollY), 0);
    await page.click("#drawBtn");
    await opened(page);
    const title = await box("#pickTitle");
    assert.ok(title.top >= (await box(".appbar")).bottom && title.bottom <= viewport.height, "the film's title is on screen (" + size + ")");
    assert.deepEqual(await problems(page), []);
    await context.close();
  }
});

test("the ticket says what the film is about; the night's own stub leaves it out, and the stub in the Library has it", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  const { PREMISES } = await import("../../js/data/premises-en.js");
  await page.evaluate(() => window.kuvert.app.stage.openFilm("1942-casablanca"));
  await page.waitForSelector("#pickPremise:not([hidden])");
  assert.equal(await page.textContent("#pickPremise"), PREMISES["1942-casablanca"]);
  assert.match(await page.textContent("#pickPremise"), /^In wartime Casablanca, a cynical nightclub owner/);
  // It reads under the film's line of facts and above the buttons, and never spills out of the paper.
  const box = (sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().toJSON(), sel);
  const [premise, facts, actions, paper] = [await box("#pickPremise"), await box("#ticketBody .t-meta"), await box("#ticketActions"), await box("#ticket .paper")];
  assert.ok(premise.top >= facts.bottom && premise.bottom <= actions.top, "between the facts and the buttons");
  assert.ok(premise.left >= paper.left && premise.right <= paper.right, "inside the ticket");
  // Another film: its own line, with no moment of the first one's.
  await page.evaluate(() => window.kuvert.app.stage.openFilm("1976-rocky"));
  await page.waitForFunction((line) => document.getElementById("pickPremise").textContent === line, PREMISES["1976-rocky"]);
  // Marked as watched tonight: the stub is about the stars, so the line steps aside…
  await page.click("#markBtn");
  await page.waitForSelector("#watchedPanel:not([hidden])");
  assert.equal(await page.isHidden("#pickPremise"), true, "not on the night's own stub");
  await page.click("#wpDone");
  // …and is back when the stub is opened again from the Library, to remember the film by.
  await page.evaluate(() => window.kuvert.app.stage.openFilm("1976-rocky"));
  await page.waitForSelector("#watchedPanel:not([hidden])");
  await page.waitForSelector("#pickPremise:not([hidden])");
  assert.equal(await page.textContent("#pickPremise"), PREMISES["1976-rocky"]);
  // The premise files are fetched as needed, never with the page: only the page's language.
  const fetched = await page.evaluate(() => performance.getEntriesByType("resource").map((r) => r.name).filter((n) => /premises-/.test(n)));
  assert.equal(fetched.length, 1);
  assert.match(fetched[0], /js\/data\/premises-en\.js$/);
  assert.equal(await page.locator('link[rel="modulepreload"][href*="premises-"]').count(), 0, "not in the start-up list");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("a film Kuvert has no line for (your own list's) shows a ticket without one", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  // A list of your own: one film Kuvert knows (same title and year, so the same id), one it doesn't.
  await page.evaluate(async () => {
    const { buildListDefinition, readCustomLists, writeCustomLists } = await import("./js/data/lists.js");
    const def = buildListDefinition({ id: "mine", name: "Mine", films: [{ title: "Casablanca", year: 1942 }, { title: "A Home Movie Nobody Knows", year: 2019 }] });
    const lists = readCustomLists(localStorage);
    lists[def.id] = def;
    writeCustomLists(localStorage, lists);
    localStorage.setItem("kuvert:activeList", "mine");
  });
  await page.reload();
  await page.waitForFunction(() => window.kuvert?.app?.list.id === "mine");
  await page.evaluate(() => window.kuvert.app.stage.openFilm("2019-a-home-movie-nobody-knows"));
  await page.waitForSelector("#ticket:not([hidden])");
  await page.waitForFunction(() => !window.kuvert.app.stage.busy);
  await page.evaluate(() => window.kuvert.app.stage.openFilm("1942-casablanca"));
  await page.waitForSelector("#pickPremise:not([hidden])");
  assert.match(await page.textContent("#pickPremise"), /^In wartime Casablanca/, "a film Kuvert knows has its line in any list");
  await page.evaluate(() => window.kuvert.app.stage.openFilm("2019-a-home-movie-nobody-knows"));
  await page.waitForFunction(() => document.getElementById("pickTitle").textContent.includes("Home Movie") && document.getElementById("pickPremise").hidden);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the Library finds films by what they are about: titles first, then the films about it, each with its line", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  await page.evaluate(() => window.kuvert.app.router.show("library"));
  await page.click('#libraryTabs button[data-f="all"]');
  await page.fill("#search", "boxer");
  await page.waitForSelector("#list .about-head");
  assert.equal(await page.textContent("#list .about-head"), "About “boxer”");
  const about = await page.$$eval("#list .film-about", (rows) => rows.map((r) => [r.querySelector(".film-title").textContent, r.querySelector(".about-line").textContent]));
  const rocky = about.find(([title]) => title === "Rocky");
  assert.ok(rocky, about.map(([title]) => title).join(", "));
  assert.match(rocky[1], /Philadelphia boxer/);
  assert.ok(about.some(([title]) => title === "Raging Bull"));
  // A title match comes first and needs no line: "rocky" is Rocky by name.
  await page.fill("#search", "rocky");
  await page.waitForFunction(() => !document.querySelector("#list .about-head"));
  assert.deepEqual(await page.$$eval("#list > li .film-title", (b) => b.map((x) => x.textContent)), ["Rocky"]);
  // Every film listed under the heading says the word in its line.
  await page.fill("#search", "shark");
  await page.waitForSelector("#list .about-head");
  assert.ok((await page.$$eval("#list .film-about .film-title", (b) => b.map((x) => x.textContent))).includes("Jaws"));
  assert.ok((await page.$$eval("#list .film-about .about-line", (b) => b.map((x) => x.textContent))).every((line) => /shark/i.test(line)));
  // Opening one from there works like any row.
  await page.locator("#list .film-about .film-title").first().click();
  await page.waitForSelector("#ticket:not([hidden])");
  // Nothing found: the hint mentions it.
  await page.evaluate(() => window.kuvert.app.router.show("library"));
  await page.fill("#search", "xylophonist");
  await page.waitForSelector("#list .empty");
  assert.match(await page.textContent("#list .empty"), /a word for what the film is about/);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the film year: a picture to share from Stats, for this year, or in January for the year just ended", async () => {
  const context = await newContext();
  await context.clock.setFixedTime(new Date("2027-01-04T19:00:00"));
  const page = await openPage(context, "/");
  await page.evaluate(() => window.kuvert.app.router.show("stats"));
  assert.equal(await page.isHidden("#shareYear"), true, "nothing dated yet");
  await page.evaluate(() => {
    const { store } = window.kuvert.app;
    for (const [id, date, stars] of [["1976-rocky", "2026-03-10", 4], ["1995-heat", "2026-03-11", 5], ["1942-casablanca", "2026-10-02", 5], ["1975-jaws", "2025-07-01", 3]]) {
      store.markSeen(id, true, { date });
      store.rate(id, stars);
    }
    window.kuvert.app.renderSoon();
  });
  await page.waitForSelector("#shareYear:not([hidden])");
  assert.equal(await page.textContent("#shareYearLabel"), "Share your film year · 2026");
  const drawn = await page.evaluate(async () => {
    const { share } = window.kuvert.app;
    const { yearReview } = await import("./js/state/year.js");
    const review = yearReview(share.watched(), 2026);
    const canvas = await share.yearCanvas(review);
    return { size: [canvas.width, canvas.height], films: review.films, top: review.top.map((f) => f.t), busiest: review.busiest, painted: canvas.getContext("2d").getImageData(100, 250, 300, 60).data.some((v, i) => i % 4 === 0 && v > 200) };
  });
  assert.deepEqual(drawn, { size: [1080, 1350], films: 3, top: ["Heat", "Casablanca", "Rocky"], busiest: { month: 2, films: 2 }, painted: true });
  const download = page.waitForEvent("download");
  await page.click("#shareYear");
  assert.equal((await download).suggestedFilename(), "kuvert-2026.png");
  await page.waitForFunction(() => /Film year image saved as kuvert-2026\.png/.test(document.getElementById("toast").textContent));
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the next day: Watched it dates the film the night it was drawn, and opens on its stars", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  const film = await page.evaluate(() => {
    const { store, catalog, stage } = window.kuvert.app;
    const f = catalog.films.find((x) => !x.tri);
    store.pick(f.id);
    store.p.drawnOn = "2026-01-10";
    store.save("ticket");
    stage.syncPick();
    return f.id;
  });
  await page.reload();
  await page.waitForFunction(() => window.kuvert?.app);
  // The saved ticket is the first thing on Tonight, still sealed.
  const order = await page.evaluate(() => [...document.querySelectorAll("#page-tonight > :not([hidden])")].map((e) => e.id || e.className.split(" ")[0]));
  assert.ok(order.indexOf("resumePick") < order.indexOf("stage"), "above the envelope: " + order.join(", "));
  assert.match(await page.textContent("#resumeLabel"), /watched it, or still on for tonight\?/);
  await page.click("#watchedIt");
  await opened(page);
  await page.waitForSelector("#watchedPanel:not([hidden])");
  assert.deepEqual(await page.evaluate((id) => ({ seen: window.kuvert.app.store.p.seen.has(id), date: window.kuvert.app.store.p.dates[id] }), film), { seen: true, date: "2026-01-10" });
  assert.match(await page.textContent("#wpWhen"), /10 Jan 2026/);
  assert.equal(await page.isHidden("#wpExtras"), true, "the night itself: just the stars and Done");
  await page.click("#wpMore");
  assert.equal(await page.isVisible("#wpRank"), true);
  // Stars put it in the ranking.
  await page.evaluate((id) => window.kuvert.app.stage.rate(id, 4), film);
  assert.match(await page.textContent("#wpRank"), /^#1 of 1 in your ranking/);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("Seen it before: watched with no date, and another film comes out of the envelope", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  await page.click("#drawBtn");
  await opened(page);
  const first = await page.evaluate(() => window.kuvert.app.store.p.current);
  assert.match(await page.getAttribute("#watchLink", "href"), /^https:\/\/www\.justwatch\.com\/us\/search\?q=/, "where to watch: JustWatch, in your streaming country");
  await page.click("#seenBefore");
  await opened(page);
  const after = await page.evaluate((id) => ({ seen: window.kuvert.app.store.p.seen.has(id), dated: id in window.kuvert.app.store.p.dates, current: window.kuvert.app.store.p.current }), first);
  assert.equal(after.seen, true);
  assert.equal(after.dated, false, "no date: it never counts toward your pace");
  assert.ok(after.current && after.current !== first, "another film is on the ticket");
  assert.match(await page.textContent("#toastText"), /marked as seen before/);
  // Undo puts the first film back on the ticket, unwatched.
  await page.click("#undoBtn");
  await page.waitForFunction((id) => window.kuvert.app.store.p.current === id && !window.kuvert.app.store.p.seen.has(id), first);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("films seen before Kuvert: tick them off in the Library, undated, straight from the welcome", async () => {
  const context = await newContext({ welcomed: false });
  const page = await openPage(context, "/");
  await page.click("#welcomeSeen");
  await page.waitForSelector("#backfillBar:not([hidden])");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.page), "library");
  const ids = await page.evaluate(() => [...document.querySelectorAll("#list .tick")].slice(0, 3).map((b) => b.dataset.key.slice(5)));
  for (const id of ids) await page.click(`#list [data-key="tick-${id}"]`);
  const marks = await page.evaluate((ids) => ids.map((id) => [window.kuvert.app.store.p.seen.has(id), id in window.kuvert.app.store.p.dates]), ids);
  assert.deepEqual(marks, ids.map(() => [true, false]), "watched, with no date");
  await page.click("#backfillDone");
  assert.equal(await page.isHidden("#backfillBar"), true);
  // Back to normal: a tick now means watched tonight.
  const next = await page.evaluate(() => [...document.querySelectorAll("#list .tick[aria-pressed=false]")][0].dataset.key.slice(5));
  await page.click(`#list [data-key="tick-${next}"]`);
  assert.equal(await page.evaluate((id) => !!window.kuvert.app.store.p.dates[id], next), true);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("Share offers the ticket as an image or a sealed invitation", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  await page.click("#drawBtn");
  await opened(page);
  await page.click("#shareBtn");
  await page.waitForSelector("#journeyDialog[open]");
  assert.equal(await page.textContent("#journeyTitle"), "Share tonight’s film");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Ticket image", exact: true }).click();
  assert.match((await download).suggestedFilename(), /^kuvert-.*\.png$/);
  assert.equal(await page.evaluate(() => document.getElementById("journeyDialog").open), false);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the Home Screen hint: on an iPhone after the first film, until Got it", async () => {
  const context = await phone();
  const page = await openPage(context, "/");
  assert.equal(await page.isHidden("#installHint"), true, "nothing watched yet");
  await page.evaluate(() => {
    const { store, catalog, stage } = window.kuvert.app;
    stage.toggleSeen(catalog.films[0].id);
  });
  await page.waitForSelector("#installHint:not([hidden])");
  assert.match(await page.textContent("#installText"), /tap Share, then Add to Home Screen/);
  await page.click("#installLater");
  assert.equal(await page.isHidden("#installHint"), true);
  await page.reload();
  await page.waitForFunction(() => window.kuvert?.app);
  assert.equal(await page.isHidden("#installHint"), true, "put away for good");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("Restore from a file takes a whole-library backup as well as a progress file", async () => {
  const context = await newContext();
  // Headless Chromium has no file pickers to click through: use the download and <input type=file> path.
  await context.addInitScript(() => {
    delete window.showSaveFilePicker;
    delete window.showOpenFilePicker;
  });
  const page = await openPage(context, "/#settings");
  const download = page.waitForEvent("download");
  await page.click("#saveLibrary");
  const file = await (await download).path();
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click("#openFile")]);
  await chooser.setFiles(file);
  await page.waitForSelector("#journeyDialog[open]");
  assert.equal(await page.textContent("#journeyTitle"), "Restore your full library");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("on a phone the ticket comes up under the bar: the poster large, its buttons on screen, the streak in words", async () => {
  const context = await phone();
  const page = await openPage(context, "/");
  // A film last week and one this week: two weeks in a row.
  await page.evaluate(() => {
    const { store } = window.kuvert.app;
    const day = (back) => new Date(Date.now() - back * 86400e3).toISOString().slice(0, 10);
    store.markSeen("1942-casablanca", true, { date: day(7) });
    store.markSeen("1995-heat", true, { date: day(0) });
  });
  await settled(page);
  await page.evaluate(() => window.kuvert.app.stage.openFilm("1976-rocky"));
  await opened(page);
  const box = (sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().toJSON(), sel);
  // After a draw the page moves up to show the ticket's buttons, as far as the title allows; here it is
  // asked to, the same way. In Safari's short window the poster and the title stay and the buttons follow.
  await page.evaluate(() => window.kuvert.app.stage.showTicket());
  await settled(page);
  const bar = await box(".appbar"),
    tabs = await box(".tabbar"),
    mark = await box("#markBtn"),
    title = await box("#pickTitle");
  assert.ok(title.top >= bar.bottom && title.bottom <= tabs.top, "the title is on screen");
  assert.ok(mark.height > 0 && mark.top < tabs.top, "Mark as watched has come into view: " + JSON.stringify([bar.bottom, title.top, mark.top, mark.bottom, tabs.top]));
  const poster = await box("#posterWell"),
    paper = await box("#ticket .paper");
  assert.ok(poster.width / paper.width >= 0.3, "the poster takes about a third of the ticket: " + poster.width + " of " + paper.width);
  // One line of facts, then what the film is about, then how it did.
  assert.equal(await page.textContent("#pickMeta"), "1976 · Best Picture winner");
  assert.equal(await page.textContent("#pickFacts"), "119 min · dir. John G. Avildsen");
  await page.waitForSelector("#pickPremise:not([hidden])");
  const order = await page.$$eval("#ticketBody .t-main > *", (els) => els.filter((e) => e.getClientRects().length).map((e) => e.id || e.className));
  assert.deepEqual(order.slice(0, 5), ["pickEyebrow", "pickTitle", "t-meta", "pickPremise", "oscarLine"]);
  const premise = await box("#pickPremise");
  assert.ok(premise.top >= poster.bottom && premise.left <= poster.left + 1, "the premise runs the full width under the poster");
  assert.match(await page.textContent("#punches"), /^2 weeks in a row$/);
  assert.equal(await page.getAttribute("#punches", "aria-label"), "2 weeks in a row with a film");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("Tonight says the name once: the masthead has it, the bar keeps to the tally; other pages keep the name in the bar", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  assert.equal(await page.isVisible(".appbar .brand"), false);
  assert.equal(await page.isVisible("#tonightTitle"), true);
  assert.equal(await page.isVisible("#tally"), true);
  await page.evaluate(() => window.kuvert.app.router.show("library"));
  assert.equal(await page.isVisible(".appbar .brand"), true);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("a first visit: the envelope and its button come first, the other ways to begin beneath, until the first draw", async () => {
  const context = await phone({ welcomed: false });
  const page = await openPage(context, "/");
  await settled(page);
  const box = (sel) => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().toJSON(), sel);
  assert.ok((await box("#drawBtn")).bottom <= (await box(".tabbar")).top, "the draw button is on the first screen");
  assert.ok((await box("#welcome")).top >= (await box("#drawBtn")).bottom, "the welcome sits under it");
  assert.deepEqual(await page.$$eval("#welcome button", (b) => b.map((x) => x.textContent)), ["I've seen some already", "Bring my own list", "Connect sync or load a backup"]);
  await page.click("#drawBtn");
  await opened(page);
  await page.waitForSelector("#welcome", { state: "hidden" });
  assert.equal(await page.evaluate(() => localStorage.getItem("kuvert:welcomed")), "1");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("Stats opens its long lists short: the top ten of the ranking and three winners to judge, the rest a tap away", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  // Fourteen rated films, six of them winners.
  await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    const winners = catalog.films.filter(catalog.isWinner).slice(0, 6),
      others = catalog.films.filter((f) => !catalog.isWinner(f)).slice(0, 8);
    [...winners, ...others].forEach((f, i) => {
      store.markSeen(f.id, true, { date: "2026-10-" + String(i + 1).padStart(2, "0") });
      store.rate(f.id, 5 - (i % 5) * 0.5);
    });
  });
  await page.evaluate(() => window.kuvert.app.router.show("stats"));
  await page.waitForSelector("#rankList .rank-row");
  assert.equal(await page.locator("#rankList .rank-row").count(), 10);
  assert.equal(await page.textContent("#rankMore"), "Show all 14");
  assert.equal(await page.locator("#verdictList > li").count(), 3);
  assert.equal(await page.textContent("#verdictMore"), "Show all 6");
  // A winner you judge stays where it is.
  const first = await page.locator("#verdictList .verdict-title").first().textContent();
  await page.locator("#verdictList > li").first().getByRole("button", { name: "Yes", exact: true }).click();
  await page.waitForSelector('#verdictList .verdict-btn[aria-pressed="true"]');
  assert.equal(await page.locator("#verdictList .verdict-title").first().textContent(), first);
  assert.equal(await page.locator("#verdictList > li").count(), 3);
  // A film moved below the tenth place opens the whole ranking, so it stays in sight.
  const tenth = await page.locator("#rankList .rank-row").nth(9).getAttribute("data-rank");
  await page.locator("#rankList .rank-row").nth(9).locator('[data-key^="rankdown-"]').click();
  await page.waitForFunction(() => document.querySelectorAll("#rankList .rank-row").length === 14);
  assert.equal(await page.locator("#rankList .rank-row").nth(10).getAttribute("data-rank"), tenth);
  assert.equal(await page.textContent("#rankMore"), "Show the top ten");
  await page.click("#rankMore");
  assert.equal(await page.locator("#rankList .rank-row").count(), 10);
  // Dragging within the top ten leaves the films below it where they were.
  const below = await page.evaluate(() => window.kuvert.app.store.p.rankings.slice(10));
  await page.click("#verdictMore");
  assert.equal(await page.locator("#verdictList > li").count(), 6);
  assert.equal(await page.textContent("#verdictMore"), "Show fewer");
  assert.deepEqual(await page.evaluate(() => window.kuvert.app.store.p.rankings.slice(10)), below);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("on a phone the ranking's arrows step aside for the title, and stay there for a keyboard", async () => {
  const context = await phone();
  const page = await openPage(context, "/");
  await page.evaluate(() => {
    const { store } = window.kuvert.app;
    for (const [id, stars] of [["1942-casablanca", 5], ["1995-heat", 4], ["1976-rocky", 3]]) {
      store.markSeen(id, true, { date: "2026-10-03" });
      store.rate(id, stars);
    }
  });
  await page.evaluate(() => window.kuvert.app.router.show("stats"));
  await page.waitForSelector("#rankList .rank-row");
  const row = page.locator('#rankList .rank-row[data-rank="1995-heat"]');
  const width = (sel) => row.locator(sel).evaluate((el) => el.getBoundingClientRect().width);
  assert.ok((await width(".rank-moves")) <= 1, "the arrows are out of sight");
  assert.ok((await width(".rank-title")) > 150, "the title has the room: " + (await width(".rank-title")));
  // Still there for a keyboard: focus shows them, and they work.
  await row.locator('[data-key="rankup-1995-heat"]').focus();
  await page.waitForFunction(() => document.querySelector('#rankList .rank-row[data-rank="1995-heat"] .rank-moves').getBoundingClientRect().width > 20);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.kuvert.app.store.p.rankings[0] === "1995-heat");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the Library shows the list as rows or as posters, and remembers which", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  await page.evaluate(() => window.kuvert.app.router.show("library"));
  await page.waitForSelector("#list > li");
  // No filter yet: the switch for tonight's draw waits until there is one.
  assert.equal(await page.isHidden("#drawSelectionRow"), true);
  assert.equal(await page.getAttribute('#listView [data-view="list"]', "aria-pressed"), "true");
  // A wide row carries the director and the running time.
  const rocky = page.locator("#list > li", { has: page.locator('[data-key="title-1976-rocky"]') });
  assert.equal(await rocky.locator(".film-dir").textContent(), "John G. Avildsen");
  assert.equal(await rocky.locator(".film-rt").textContent(), "119 min");
  assert.equal(await rocky.locator(".film-dir").isVisible(), true);
  // A decade is a filter: the switch shows, and goes again with the filter.
  await page.locator("#decs .dec").first().click();
  await page.waitForSelector("#drawSelectionRow:not([hidden])");
  await page.locator("#decs .dec").first().click();
  await page.waitForSelector("#drawSelectionRow", { state: "hidden" });
  // As posters: every film still there, each opening its ticket.
  const rows = await page.locator("#list > li").count();
  await page.click('#listView [data-view="posters"]');
  await page.waitForSelector("#list.as-posters .p-film");
  assert.equal(await page.locator("#list .p-film").count(), rows);
  assert.equal(await page.getAttribute('#listView [data-view="posters"]', "aria-pressed"), "true");
  assert.match(await page.locator("#list .p-film", { has: page.locator('[data-key="title-1976-rocky"]') }).textContent(), /^Rocky 1976 · Won$/);
  // Found by what it is about, the heading spans the grid.
  await page.fill("#search", "boxer");
  await page.waitForSelector("#list.as-posters .about-head");
  await page.fill("#search", "");
  // Remembered after a reload.
  await page.reload();
  await page.waitForFunction(() => window.kuvert?.app);
  await page.evaluate(() => window.kuvert.app.router.show("library"));
  await page.waitForSelector("#list.as-posters .p-film");
  await page.locator('#list [data-key="title-1976-rocky"]').click();
  await page.waitForSelector("#ticket:not([hidden])");
  assert.match(await page.textContent("#pickTitle"), /Rocky/);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("a tab is lit only on the page you are on: Envelopes looks like the others until you open it", async () => {
  for (const [make, nav] of [[() => phone(), ".tabbar"], [() => newContext(), ".appbar .tabs"]]) {
    const context = await make();
    const page = await openPage(context, "/");
    const colors = () =>
      page.evaluate((nav) => Object.fromEntries([...document.querySelectorAll(nav + " a[data-route]")].map((a) => [a.dataset.route, getComputedStyle(a.querySelector(".icon")).color])), nav);
    const lit = async (route) => {
      await page.waitForFunction(([nav, route]) => document.querySelector(nav + ' a[data-route="' + route + '"]').getAttribute("aria-current") === "page", [nav, route]);
      await settled(page);
      const c = await colors();
      return Object.keys(c).filter((r) => c[r] !== c[route === "library" ? "stats" : "library"]);
    };
    assert.deepEqual(await lit("tonight"), ["tonight"], nav + " on Tonight");
    await page.evaluate(() => window.kuvert.app.router.show("journeys"));
    assert.deepEqual(await lit("journeys"), ["journeys"], nav + " on Envelopes");
    assert.deepEqual(await problems(page), []);
    await context.close();
  }
});
