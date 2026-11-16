// Stats as paper and film: each winner to judge is a ballot slip, the weekly streak is a klippkort, and
// each decade has its strip of film. The numbers and the buttons are the ones Stats always had. And the
// small drawings, all in one hand, over lists with nothing in them and in the milestones' stamps.
import { test } from "node:test";
import assert from "node:assert/strict";
import { env, newContext, openPage, problems } from "./helpers.mjs";

// Under reduced motion a change is still a transition, a hundredth of a millisecond long: a box read in the
// frame of the change is the old one. This waits until nothing is in transition.
const calm = (page) => page.waitForFunction(() => document.getAnimations().every((a) => a.constructor.name !== "CSSTransition" || a.playState !== "running"));
// A Wednesday evening: its week runs from Monday 16 to Sunday 22 November.
const NOW = new Date("2026-11-18T20:00:00");
const stats = async (page) => {
  await page.evaluate(() => window.kuvert.app.router.show("stats"));
  await calm(page);
};

test("each winner to judge is a ballot slip: the same three buttons, the chosen one crossed in ink", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  const [first] = await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    const winners = catalog.films.filter(catalog.isWinner).slice(0, 2);
    winners.forEach((f) => store.markSeen(f.id, true));
    return winners.map((f) => ({ id: f.id, t: f.t, y: f.y }));
  });
  await stats(page);
  await page.waitForSelector("#verdictList > li.ballot");
  assert.equal(await page.locator("#verdictList > li.ballot").count(), 2);
  const slip = page.locator("#verdictList > li.ballot").first();
  // The head is print, kept from screen readers; the title and the three buttons are what is read.
  assert.equal(await slip.locator(".ballot-head").getAttribute("aria-hidden"), "true");
  assert.equal((await slip.locator(".ballot-head").innerText()).replace(/\s+/g, " ").toUpperCase(), "VALSEDEL BEST PICTURE · " + first.y);
  assert.equal(await slip.locator(".verdict-title").textContent(), first.t + " (" + first.y + ")");
  assert.deepEqual(await slip.getByRole("button").allTextContents(), ["Yes", "Unsure", "No"]);
  assert.equal(await slip.getByRole("group").getAttribute("aria-label"), "Did " + first.t + " deserve Best Picture?");
  // Paper, with a box before each word; a cross is drawn on the one that is pressed, and on no other.
  const look = () =>
    slip.evaluate((li) => ({
      paper: /paper\.webp/.test(getComputedStyle(li).backgroundImage),
      boxes: [...li.querySelectorAll(".verdict-btn")].map((b) => getComputedStyle(b, "::before").width).join(" "),
      crossed: [...li.querySelectorAll(".verdict-btn")].filter((b) => getComputedStyle(b, "::after").content !== "none").map((b) => b.textContent + ":" + b.getAttribute("aria-pressed")),
    }));
  assert.deepEqual(await look(), { paper: true, boxes: "20px 20px 20px", crossed: [] });
  await slip.getByRole("button", { name: "No", exact: true }).click();
  await page.waitForSelector('#verdictList .verdict-btn.v-no[aria-pressed="true"]');
  await calm(page);
  assert.deepEqual((await look()).crossed, ["No:true"]);
  // "No" brings the line to write the film that should have won on.
  assert.equal(await slip.locator(".should-won select").isVisible(), true);
  assert.equal(await page.evaluate((id) => window.kuvert.app.store.p.verdicts[id], first.id), "no");
  await slip.getByRole("button", { name: "Yes", exact: true }).click();
  await page.waitForSelector('#verdictList .verdict-btn.v-yes[aria-pressed="true"]');
  await calm(page);
  assert.deepEqual((await look()).crossed, ["Yes:true"]);
  assert.equal(await slip.locator(".should-won").count(), 0);
  // Every button is big enough to tap.
  const sizes = await slip.evaluate((li) => [...li.querySelectorAll(".verdict-btn")].map((b) => b.getBoundingClientRect()).map((r) => r.width >= 44 && r.height >= 40));
  assert.deepEqual(sizes, [true, true, true]);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the weekly streak is a klippkort: a hole for every week in a row, and this week's ring waiting", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  await page.clock.setFixedTime(NOW);
  await stats(page);
  const card = async () => {
    await calm(page);
    return page.evaluate(() => ({
      holes: [...document.querySelectorAll("#kkHoles li")].map((li) => (li.className || "-") + li.textContent).join(" "),
      no: document.getElementById("kkNo").textContent,
      text: document.getElementById("kkStreak").textContent + " | " + document.getElementById("kkNote").textContent,
    }));
  };
  const watch = (days) =>
    page.evaluate((days) => {
      const { store, catalog } = window.kuvert.app;
      days.forEach((date, i) => store.markSeen(catalog.films[i].id, true, { date }));
    }, days);
  // Nothing dated yet: an unpunched card, with the first ring marked.
  assert.equal(await page.isVisible("#klippkort"), true);
  assert.deepEqual(await card(), { holes: "due1 -2 -3 -4 -5 -6 -7 -8 -9 -10", no: "Nr 001", text: "No streak yet | A film this week punches the first hole." });
  // A film in each of the last two weeks: two holes, and this week's ring is the next.
  await watch(["2026-11-03", "2026-11-10"]);
  await page.waitForFunction(() => document.querySelectorAll("#kkHoles li.cut").length === 2);
  assert.deepEqual(await card(), { holes: "cut cut due3 -4 -5 -6 -7 -8 -9 -10", no: "Nr 001", text: "2 weeks in a row | This week's hole is still to punch." });
  await watch(["2026-11-03", "2026-11-10", "2026-11-17"]);
  await page.waitForFunction(() => document.querySelectorAll("#kkHoles li.cut").length === 3);
  assert.deepEqual(await card(), { holes: "cut cut cut -4 -5 -6 -7 -8 -9 -10", no: "Nr 001", text: "3 weeks in a row | This week is punched." });
  // Twelve weeks: the first card is full and put away, and the second has two holes.
  await watch(Array.from({ length: 12 }, (_, i) => new Date(Date.UTC(2026, 10, 17 - i * 7)).toISOString().slice(0, 10)));
  await page.waitForFunction(() => document.getElementById("kkNo").textContent === "Nr 002");
  assert.deepEqual(await card(), { holes: "cut cut -3 -4 -5 -6 -7 -8 -9 -10", no: "Nr 002", text: "12 weeks in a row | This week is punched. 1 card full before this one." });
  // What is printed on the card is decoration: the two lines under the holes are what is read. A hole
  // goes through to the page.
  const made = await page.evaluate(() => ({
    hidden: [document.querySelector(".kk-head"), document.getElementById("kkHoles")].map((el) => el.getAttribute("aria-hidden")),
    hole: /radial-gradient/.test(getComputedStyle(document.querySelector("#kkHoles li.cut")).backgroundImage),
    ring: getComputedStyle(document.querySelector("#kkHoles li:not(.cut)")).borderTopStyle,
  }));
  assert.deepEqual(made, { hidden: ["true", "true"], hole: true, ring: "solid" });
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("each decade has its strip of film: a frame per film, lit once it is watched", async () => {
  const context = await env.browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block", reducedMotion: "reduce" });
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await context.addInitScript(() => localStorage.setItem("kuvert:welcomed", "1"));
  const page = await openPage(context, "/");
  // Three films of the seventies and one of the forties.
  const marked = await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    const of = (decade) => catalog.films.filter((f) => Math.floor(f.y / 10) * 10 === decade);
    const films = [...of(1970).slice(0, 3), of(1940)[4]];
    films.forEach((f) => store.markSeen(f.id, true));
    return films.map((f) => ({ y: f.y, name: f.t + " (" + f.y + ")" }));
  });
  await stats(page);
  await page.waitForSelector("#statsDecades .strip i.on");
  assert.equal(await page.textContent("#decadeSummary"), "One frame per film, oldest first");
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll("#statsDecades tr:not(.strip-row)")].map((tr) => {
      const strip = tr.nextElementSibling,
        [watched, total] = tr.children[1].textContent.split(" / ").map(Number),
        box = strip.querySelector(".strip").getBoundingClientRect();
      return {
        decade: tr.children[0].textContent,
        watched,
        total,
        isStrip: strip.className === "strip-row" && strip.getAttribute("aria-hidden") === "true",
        frames: strip.querySelectorAll(".strip i").length,
        lit: [...strip.querySelectorAll(".strip i.on")].map((i) => i.title),
        years: [...strip.querySelectorAll(".strip i")].map((i) => Number(i.title.slice(-5, -1))),
        width: box.width,
        right: box.right,
      };
    }),
  );
  assert.ok(rows.length >= 10 && rows.every((r) => r.isStrip), "every decade's numbers are followed by its strip");
  // As many frames as the decade has films, and as many lit as are watched: the numbers above, drawn.
  for (const r of rows) assert.deepEqual([r.frames, r.lit.length], [r.total, r.watched], r.decade);
  // The frames are the decade's films, oldest first, and the lit ones are the films that are watched.
  for (const r of rows) assert.deepEqual(r.years, [...r.years].sort((a, b) => a - b), r.decade);
  const lit = (decade) => rows.find((r) => r.decade === decade + "s").lit.sort();
  assert.deepEqual(lit(1970), marked.filter((f) => f.y >= 1970 && f.y < 1980).map((f) => f.name).sort());
  assert.deepEqual(lit(1940), marked.filter((f) => f.y < 1950).map((f) => f.name).sort());
  // The decade with the most films spans the column; the others are as long as their films make them.
  const longest = rows.reduce((a, b) => (b.frames > a.frames ? b : a)),
    pitch = longest.width / longest.frames;
  assert.ok(longest.width > 300 && longest.right <= 390, "the longest strip fills the column and stays on the screen: " + longest.width);
  for (const r of rows.filter((r) => r.frames >= 10)) assert.ok(Math.abs(r.width / r.frames - pitch) < 0.6, r.decade + " has the same frame size as the longest: " + r.width / r.frames + " and " + pitch);
  // A frame names its film for whoever points at it.
  assert.match(await page.locator("#statsDecades .strip i.on").first().getAttribute("title"), /^.+ \(19\d\d\)$/);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("a list with nothing in it has a small drawing over its words, and a milestone has one in its stamp", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  /** The drawings under a place, by the symbol each one copies. */
  const art = (sel) => page.evaluate((sel) => [...document.querySelectorAll(sel + " svg.spot use")].map((u) => u.getAttribute("href")), sel);
  // Stats with nothing watched: a podium where the ranking will be, a trophy where the winners will.
  await stats(page);
  assert.deepEqual(await art("#rankList .empty"), ["#d-podium"]);
  assert.deepEqual(await art("#verdictList .empty"), ["#d-trophy"]);
  assert.equal(await page.textContent("#rankList .empty strong"), "No ranking yet");
  // Milestones: a drawing in the stamp, or the number the milestone counts to.
  await page.click("#milestoneMore");
  const stamps = await page.evaluate(() => [...document.querySelectorAll("#milestoneGrid .milestone")].map((m) => [m.querySelector("h3").textContent, m.querySelector(".milestone-stamp use")?.getAttribute("href") || m.querySelector(".milestone-stamp b").textContent]));
  assert.deepEqual(stamps.slice(0, 8), [
    ["The first ticket", "#d-ticket"],
    ["25 films watched", "25"],
    ["50 films watched", "50"],
    ["100 films watched", "100"],
    ["The whole envelope", "#d-envelope"],
    ["Across the decades", "#d-hourglass"],
    ["Winner’s circle", "#d-trophy"],
    ["Beyond the ballot", "#d-rosette"],
  ]);
  assert.ok(stamps.length > 8 && stamps.slice(8).every(([, stamp]) => stamp === "#d-clapper"), "each series has a clapperboard");
  // The Library: a magnifier over a search that finds nothing, a seat where the watched films will be,
  // and one each for the side lists.
  await page.evaluate(() => window.kuvert.app.router.show("library"));
  await page.fill("#search", "zzzzqq");
  await page.waitForSelector("#list .empty");
  assert.deepEqual(await art("#list .empty"), ["#d-magnifier"]);
  // Kuvert draws a change on the next frame. Two changes inside one frame are drawn once, for the list that
  // is then on screen, and a list that has just been hidden keeps what it last showed: so each step here
  // waits for its frame, and looks only at what is on screen.
  const frame = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  const onScreen = () => page.locator("#page-library .empty:visible svg.spot use").evaluateAll((uses) => uses.map((u) => u.getAttribute("href")));
  await page.fill("#search", "");
  await frame();
  assert.equal(await page.locator("#list .empty").count(), 0, "the list is back once the search is cleared");
  assert.deepEqual(await art("#seenList .empty"), ["#d-seat"]);
  for (const [filter, drawing] of [["recent", "#d-ticket"], ["shelf", "#d-disc"], ["skipped", "#d-projector"]]) {
    await page.evaluate((filter) => window.kuvert.app.store.set({ filter }), filter);
    await frame();
    assert.deepEqual(await onScreen(), [drawing], filter);
  }
  // Each is a picture of the words under it, kept from screen readers; it copies a drawing that is in the
  // page, takes the colour of the words around it, and has one detail picked out in brass.
  const drawn = await page.locator("#page-library .empty:visible svg.spot").first().evaluate((svg) => {
    const symbol = document.querySelector(svg.querySelector("use").getAttribute("href"));
    return {
      hidden: svg.getAttribute("aria-hidden"),
      size: Math.round(svg.getBoundingClientRect().width),
      symbol: symbol.tagName + " " + symbol.getAttribute("viewBox"),
      pen: getComputedStyle(svg).stroke === getComputedStyle(svg).color && getComputedStyle(svg).fill === "none",
      accent: getComputedStyle(svg).getPropertyValue("--spot-accent").trim() === getComputedStyle(document.documentElement).getPropertyValue("--brass").trim() && !!symbol.querySelector(".d-a"),
      drawings: [...document.querySelectorAll('.sprite symbol[id^="d-"]')].every((s) => s.getAttribute("viewBox") === "0 0 48 48" && s.querySelector("path, circle, rect")),
    };
  });
  assert.deepEqual(drawn, { hidden: "true", size: 64, symbol: "symbol 0 0 48 48", pen: true, accent: true, drawings: true });
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("SEAGAL takes none of the paper: no slips, no klippkort, no strips", async () => {
  const context = await newContext();
  await context.addInitScript(() => localStorage.setItem("kuvert:mode", "seagal"));
  const page = await openPage(context, "/");
  await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    catalog.films.filter(catalog.isWinner).slice(0, 2).forEach((f) => store.markSeen(f.id, true, { date: "2026-11-10" }));
  });
  await stats(page);
  await page.waitForSelector("#verdictList > li");
  const seen = await page.evaluate(() => ({
    verdicts: document.querySelectorAll("#verdictList > li").length,
    slips: document.querySelectorAll(".ballot, .ballot-head").length,
    klippkort: document.getElementById("klippkort").hidden,
    strips: document.querySelectorAll(".strip-row, .strip").length,
    caption: document.getElementById("decadeSummary").textContent,
    decades: document.querySelectorAll("#statsDecades tr").length,
    // Nor the small drawings: its stamps keep to numbers and letters, and its empty lists to words.
    drawings: document.querySelectorAll("main svg.spot").length,
    stamps: [...document.querySelectorAll("#milestoneGrid .milestone-stamp b")].map((b) => b.textContent).join(" "),
    empty: document.querySelector("#rankList .empty strong")?.textContent,
  }));
  assert.deepEqual({ ...seen, decades: seen.decades >= 10 }, { verdicts: 2, slips: 0, klippkort: true, strips: 0, caption: "", decades: true, drawings: 0, stamps: seen.stamps, empty: "Nothing ranked yet" });
  assert.match(seen.stamps, /\b25\b.*\bERA\b|\bERA\b.*\b25\b/, "SEAGAL's stamps say what they always said: " + seen.stamps);
  assert.deepEqual(await problems(page), []);
  await context.close();
});
