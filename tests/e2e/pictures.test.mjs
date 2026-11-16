// The pictures Kuvert makes to share (js/share/images.js) carry the app's own look: the ticket is printed
// on its decade's paper with the film's engraving, in the light of its poster; the best of a ranking and
// of a film year are stamps from the album. Without a poster to be had, or in SEAGAL, they are plain.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newContext, openPage, problems, redBluePoster, servePosters, withFreshPosters, withoutShippedPosters } from "./helpers.mjs";

// Where things are drawn (js/share/images.js): the ticket's card, the three stamps under a ranking's
// heading, the five under "The year's best".
const CARD = { x: 90, y: 150, w: 900, h: 1020 },
  PODIUM = { x: 80, y: 374, w: 280, h: 438, step: 320 },
  BEST = { x: 80, y: 730, w: 168, h: 264, step: 188 };

const near = (pixel, colour, by = 3) => pixel.slice(0, 3).every((v, i) => Math.abs(v - colour[i]) <= by);
const hex = (colour) => [1, 3, 5].map((i) => parseInt(colour.slice(i, i + 2), 16));
/** An evening late in 2026, and the films watched that year, with stars: Rocky the best, so it comes first. */
const EVENING = new Date("2026-11-18T20:00:00");
const SEEN = [["1976-rocky", "2026-03-10", 5], ["1995-heat", "2026-03-11", 4.5], ["1942-casablanca", "2026-10-02", 4], ["1975-jaws", "2026-10-09", 3.5], ["1955-marty", "2026-11-02", 3]];
const watch = (page) =>
  page.evaluate((seen) => {
    const { store } = window.kuvert.app;
    for (const [id, date, stars] of seen) {
      store.markSeen(id, true, { date });
      store.rate(id, stars);
    }
  }, SEEN);
/** Draws one of the pictures in the page and reads pixels off it: { size, at: { name: [r, g, b, a] }, … }. */
const draw = (page, kind, arg, points = {}, extra = null) =>
  page.evaluate(
    async ([kind, arg, points, extra]) => {
      const { share, catalog } = window.kuvert.app;
      const { yearReview } = await import("./js/state/year.js");
      const canvas = kind === "ticket" ? await share.ticketCanvas(catalog.byId.get(arg)) : kind === "ranking" ? await share.rankingCanvas() : await share.yearCanvas(yearReview(share.watched(), arg));
      const ctx = canvas.getContext("2d"),
        px = (x, y) => [...ctx.getImageData(x, y, 1, 1).data];
      const out = { size: [canvas.width, canvas.height], at: Object.fromEntries(Object.entries(points).map(([name, [x, y]]) => [name, px(x, y)])) };
      if (extra) {
        // A strip of the picture: how many of its rows carry ink (a pixel well darker than the strip's
        // first, which is bare paper), and the strip itself boiled down to a number.
        const [x, y, w, h] = extra,
          data = ctx.getImageData(x, y, w, h).data,
          paper = data[0] + data[1] + data[2];
        let rows = 0,
          sum = 0;
        for (let row = 0; row < h; row++) {
          let inked = false;
          for (let col = 0; col < w; col++) {
            const i = (row * w + col) * 4,
              light = data[i] + data[i + 1] + data[i + 2];
            if (paper - light > 90) inked = true;
            sum = (sum * 31 + light) % 1000000007;
          }
          rows += inked;
        }
        out.strip = { rows, sum };
      }
      return out;
    },
    [kind, arg, points, extra],
  );

test("the ticket picture is printed like the ticket: its decade's paper, the film's engraving, its poster's light", async () => {
  const context = await newContext();
  await withFreshPosters(context);
  const posters = await servePosters(context, await redBluePoster());
  const page = await openPage(context, "/");
  // Rocky's poster can be had (red on the left, blue on the right); no other film's can.
  const rockyPoster = await page.evaluate(() => window.kuvert.app.store.posterPath("1976-rocky"));
  assert.match(rockyPoster, /^\/.+\.jpg$/, "Kuvert's poster for Rocky is in use");
  posters.add(rockyPoster);
  const colours = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement),
      stock = (decade, win = false) => {
        const probe = Object.assign(document.createElement("div"), { className: "ticket" + (win ? " win" : ""), hidden: true });
        probe.dataset.stock = decade;
        document.body.append(probe);
        const style = getComputedStyle(probe),
          found = [style.getPropertyValue("--stock").trim(), style.getPropertyValue("--band").trim()];
        probe.remove();
        return found;
      };
    return { brass: root.getPropertyValue("--brass").trim(), seventies: stock("1970"), forties: stock("1940", true) };
  });
  const POINTS = {
    band: [CARD.x + 450, CARD.y + 6],
    foot: [CARD.x + 450, CARD.y + CARD.h - 4],
    // Bare paper, between the ticket's inner frame and its poster.
    paper: [CARD.x + 35, CARD.y + 400],
    // The room, beside the ticket: where the poster's first colour glows, and where its second does.
    upperLeft: [30, 243],
    lowerRight: [1050, 1161],
  };
  // The strip under the ticket's head, where the engraved band runs.
  const BAND = [CARD.x + 56, CARD.y + 112, CARD.w - 112, 28];
  const jaws = await draw(page, "ticket", "1975-jaws", POINTS, BAND),
    taxi = await draw(page, "ticket", "1976-taxi-driver", POINTS, BAND),
    casablanca = await draw(page, "ticket", "1942-casablanca", POINTS, BAND),
    rocky = await draw(page, "ticket", "1976-rocky", POINTS, BAND);
  assert.deepEqual(jaws.size, [1080, 1350]);
  // A nominee of the seventies: the decade's paper, and the decade's colour at the head and the foot.
  assert.ok(near(jaws.at.band, hex(colours.seventies[1])) && near(jaws.at.foot, hex(colours.seventies[1])), "the seventies' band: " + JSON.stringify(jaws.at));
  assert.ok(near(jaws.at.paper, hex(colours.seventies[0]), 26), "the seventies' paper: " + jaws.at.paper + " for " + colours.seventies[0]);
  // A winner of the forties: its own decade's paper, and brass.
  assert.ok(near(casablanca.at.band, hex(colours.brass)) && near(casablanca.at.foot, hex(colours.brass)), "a winner's band is brass: " + JSON.stringify(casablanca.at));
  assert.ok(near(casablanca.at.paper, hex(colours.forties[0]), 26), "the forties' paper: " + casablanca.at.paper + " for " + colours.forties[0]);
  assert.notEqual(colours.forties[0], colours.seventies[0]);
  assert.ok(!near(casablanca.at.paper, jaws.at.paper, 8), "two decades, two papers");
  // The engraving: a band of woven lines a dozen rows deep where a plain ticket has one dashed rule, and
  // no two films with the same one, on the same paper in the same ink.
  for (const [name, ticket] of Object.entries({ jaws, taxi, casablanca, rocky })) assert.ok(ticket.strip.rows >= 12, name + "'s band: " + ticket.strip.rows + " rows of ink");
  assert.deepEqual(taxi.at.band, jaws.at.band);
  assert.notEqual(taxi.strip.sum, jaws.strip.sum, "each film has its own engraving");
  // The poster lights the room: red from the upper left, blue from the lower right. No poster, no light.
  const lift = (lit, dark, channel) => lit[channel] - dark[channel];
  assert.ok(lift(rocky.at.upperLeft, jaws.at.upperLeft, 0) > 40 && lift(rocky.at.upperLeft, jaws.at.upperLeft, 2) < 20, "red from the upper left: " + rocky.at.upperLeft + " against " + jaws.at.upperLeft);
  assert.ok(lift(rocky.at.lowerRight, jaws.at.lowerRight, 2) > 30 && lift(rocky.at.lowerRight, jaws.at.lowerRight, 0) < 20, "blue from the lower right: " + rocky.at.lowerRight + " against " + jaws.at.lowerRight);
  assert.deepEqual(taxi.at.upperLeft, jaws.at.upperLeft, "the room is the same for every film without a poster");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the best of a ranking and of a film year are stamps from the album, their posters on them", async () => {
  const context = await newContext();
  await context.clock.setFixedTime(EVENING);
  await withFreshPosters(context, EVENING);
  const posters = await servePosters(context, await redBluePoster());
  const page = await openPage(context, "/");
  const rockyPoster = await page.evaluate(() => window.kuvert.app.store.posterPath("1976-rocky"));
  assert.match(rockyPoster, /^\/.+\.jpg$/, "Kuvert's poster for Rocky is in use that evening");
  posters.add(rockyPoster);
  await watch(page);
  const paper = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--paper").trim()),
    brass = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--brass").trim());
  const stampPoints = (S, i = 0) => ({
    // A hole of the perforation, on the stamp's very corner: the picture shows through.
    ["hole" + i]: [S.x + i * S.step, S.y],
    // Its paper, between the holes and the poster.
    ["edge" + i]: [S.x + i * S.step + Math.round(S.w * 0.032), S.y + Math.round(S.h / 2) + 3],
    // The poster: its left side, and its right.
    ["left" + i]: [S.x + i * S.step + Math.round(S.w * 0.25), S.y + Math.round(S.h * 0.6)],
    ["right" + i]: [S.x + i * S.step + Math.round(S.w * 0.85), S.y + Math.round(S.h * 0.6)],
  });
  const dark = (pixel) => pixel.slice(0, 3).every((v) => v < 70),
    red = (pixel) => pixel[0] > 170 && pixel[1] < 90 && pixel[2] < 90,
    blue = (pixel) => pixel[2] > 150 && pixel[0] < 90;
  // The ranking: three stamps under the heading, then the list from the fourth film on.
  const ranking = await draw(page, "ranking", null, { ...stampPoints(PODIUM, 0), ...stampPoints(PODIUM, 1), tab: [PODIUM.x + 30, PODIUM.y + 30] });
  assert.deepEqual(ranking.size, [1080, PODIUM.y + PODIUM.h + 128 + 2 * 64 + 170], "three stamps, and a list of two");
  assert.ok(dark(ranking.at.hole0) && near(ranking.at.edge0, hex(paper), 12), "perforated paper: " + JSON.stringify(ranking.at));
  assert.ok(red(ranking.at.left0) && blue(ranking.at.right0), "Rocky's poster on the first stamp: " + JSON.stringify(ranking.at));
  assert.ok(near(ranking.at.tab, hex(brass), 6), "its place on a brass tab: " + ranking.at.tab);
  // A film whose poster can't be had still gets its stamp, with the horse on a dark ground.
  assert.ok(dark(ranking.at.hole1) && near(ranking.at.edge1, hex(paper), 12) && dark(ranking.at.right1), "the second stamp, without a poster: " + JSON.stringify(ranking.at));
  // The film year: five stamps under "The year's best".
  const year = await draw(page, "year", 2026, { ...stampPoints(BEST, 0), ...stampPoints(BEST, 4) });
  assert.deepEqual(year.size, [1080, 1350]);
  assert.ok(dark(year.at.hole0) && near(year.at.edge0, hex(paper), 12) && red(year.at.left0) && blue(year.at.right0), "Rocky, the year's best, on the first stamp: " + JSON.stringify(year.at));
  assert.ok(dark(year.at.hole4) && near(year.at.edge4, hex(paper), 12), "five stamps: " + JSON.stringify(year.at));
  // Saving the pictures still works, stamps and all.
  await page.evaluate(() => window.kuvert.app.router.show("stats"));
  const download = page.waitForEvent("download");
  await page.click("#shareRanking");
  assert.equal((await download).suggestedFilename(), "kuvert-ranking.png");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("with no poster to be had the two pictures keep their lists, and SEAGAL's stay plain", async () => {
  // No posters at all: Kuvert has none of its own, and TMDB is out of reach.
  const context = await newContext();
  await context.clock.setFixedTime(EVENING);
  await withoutShippedPosters(context);
  const page = await openPage(context, "/");
  await watch(page);
  const paper = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--paper").trim());
  const where = { podium: [PODIUM.x + 9, PODIUM.y + 222], best: [BEST.x + 5, BEST.y + 135] };
  const ranking = await draw(page, "ranking", null, where),
    year = await draw(page, "year", 2026, where);
  assert.deepEqual(ranking.size, [1080, 900], "five rows from the top");
  assert.ok(!near(ranking.at.podium, hex(paper), 40) && !near(year.at.best, hex(paper), 40), "no stamps: " + JSON.stringify([ranking.at, year.at]));
  assert.deepEqual(await problems(page), []);
  await context.close();
  // SEAGAL: a case file carries no engraving, no decade stock and no marks from the post, posters or not.
  const seagal = await newContext();
  await seagal.clock.setFixedTime(EVENING);
  await seagal.addInitScript(() => localStorage.setItem("kuvert:mode", "seagal"));
  await withFreshPosters(seagal, EVENING);
  const posters = await servePosters(seagal, await redBluePoster());
  const file = await openPage(seagal, "/");
  const rockyPoster = await file.evaluate(() => window.kuvert.app.store.posterPath("1976-rocky"));
  assert.match(rockyPoster, /^\/.+\.jpg$/, "the poster is there to be had; SEAGAL does without");
  posters.add(rockyPoster);
  await watch(file);
  const plain = await file.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return { paper: root.getPropertyValue("--paper").trim(), blue: root.getPropertyValue("--blue").trim() };
  });
  assert.deepEqual((await draw(file, "ranking", null)).size, [1080, 900]);
  const ticket = await draw(file, "ticket", "1975-jaws", { band: [CARD.x + 450, CARD.y + 6], foot: [CARD.x + 450, CARD.y + CARD.h - 4], paper: [CARD.x + 35, CARD.y + 400] }, [CARD.x + 56, CARD.y + 112, CARD.w - 112, 28]);
  assert.ok(near(ticket.at.band, hex(plain.blue)) && near(ticket.at.foot, hex(plain.blue)) && near(ticket.at.paper, hex(plain.paper), 26), "the case file's own paper and bands: " + JSON.stringify(ticket.at) + " for " + JSON.stringify(plain));
  assert.ok(ticket.strip.rows <= 3, "a dashed rule, not an engraving: " + ticket.strip.rows + " rows of ink");
  assert.deepEqual(await problems(file), []);
  await seagal.close();
});
