// Kuvert's look: the poster lights the room, every ticket has its own engraving and its decade's paper,
// the envelope collects marks, the watched wall is a stamp album, and a kurbits garland grows on Stats.
import { test } from "node:test";
import assert from "node:assert/strict";
import { env, newContext, openPage, problems } from "./helpers.mjs";

const opened = (page) => page.waitForFunction(() => !window.kuvert.app.stage.busy && window.kuvert.app.stage.open);
// Under reduced motion a change is still a transition, a hundredth of a millisecond long: a colour read in
// the frame of the change is the old one. This waits until nothing is in transition.
const calm = (page) => page.waitForFunction(() => document.getAnimations().every((a) => a.constructor.name !== "CSSTransition" || a.playState !== "running"));
const hue = (css) => {
  const [r, g, b] = css.match(/\d+/g).map(Number);
  return r > g && r > b ? "red" : g > b ? "green" : "blue";
};
/** A poster for the test: the left 60% red, the rest blue, with a black bar at the top. */
async function poster() {
  const context = await env.browser.newContext({ viewport: { width: 120, height: 180 } });
  const page = await context.newPage();
  await page.setContent('<body style="margin:0;background:linear-gradient(90deg,#d21e28 60%,#1e3cc8 60%)"><div style="height:24px;background:#000"></div></body>');
  const png = await page.screenshot();
  await context.close();
  return png;
}

test("the poster lights the room while its ticket is out, and a film with no poster leaves it dark", async () => {
  const png = await poster();
  const context = await newContext();
  // Only Rocky has a poster the page can read; every other request to TMDB is refused, as in the other tests.
  let rocky = "";
  await context.route("https://image.tmdb.org/**", (route) =>
    rocky && new URL(route.request().url()).pathname.endsWith(rocky) ? route.fulfill({ status: 200, contentType: "image/png", headers: { "access-control-allow-origin": "*" }, body: png }) : route.abort(),
  );
  const page = await openPage(context, "/");
  rocky = await page.evaluate(() => window.kuvert.app.store.posterPath("1976-rocky"));
  assert.match(rocky, /^\/.+\.jpg$/, "Kuvert ships a poster for Rocky");
  const light = () =>
    page.evaluate(() => {
      const root = document.documentElement;
      return { lit: root.hasAttribute("data-lit"), a: root.style.getPropertyValue("--light-a"), b: root.style.getPropertyValue("--light-b"), shown: getComputedStyle(document.getElementById("roomLight")).opacity };
    });
  assert.deepEqual(await light(), { lit: false, a: "", b: "", shown: "0" }, "dark before any ticket");
  await page.evaluate(() => window.kuvert.app.stage.openFilm("1976-rocky"));
  await opened(page);
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-lit"));
  await page.waitForFunction(() => getComputedStyle(document.getElementById("roomLight")).opacity === "1");
  const on = await light();
  assert.deepEqual([hue(on.a), hue(on.b)], ["red", "blue"], JSON.stringify(on));
  // The light belongs to Tonight: another page is not lit, and coming back it is again.
  await page.evaluate(() => window.kuvert.app.router.show("library"));
  await page.waitForFunction(() => getComputedStyle(document.getElementById("roomLight")).opacity === "0");
  await page.evaluate(() => window.kuvert.app.router.show("tonight"));
  await page.waitForFunction(() => getComputedStyle(document.getElementById("roomLight")).opacity === "1");
  // A film whose poster can't be shown: the light goes with the last one.
  await page.evaluate(() => window.kuvert.app.stage.openFilm("1942-casablanca"));
  await page.waitForFunction(() => !document.documentElement.hasAttribute("data-lit"));
  assert.deepEqual([(await light()).a, (await light()).b], ["", ""]);
  // Closing the envelope puts the room back as it was.
  await page.evaluate(() => window.kuvert.app.stage.openFilm("1976-rocky"));
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-lit"));
  await page.click("#ticketClose");
  await page.waitForFunction(() => getComputedStyle(document.getElementById("roomLight")).opacity === "0");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("every ticket carries its own engraving and its decade's paper; a winner's band is brass", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  const ticket = async (id) => {
    await page.evaluate((id) => window.kuvert.app.stage.openFilm(id), id);
    await opened(page);
    await page.waitForFunction((id) => window.kuvert.app.stage.shown?.id === id, id);
    await calm(page);
    return page.evaluate(() => {
      const t = document.getElementById("ticket"),
        css = getComputedStyle(t);
      return {
        stock: t.dataset.stock,
        paper: getComputedStyle(t.querySelector(".paper")).backgroundColor,
        bandColour: css.getPropertyValue("--band").trim(),
        band: [...document.querySelectorAll("#ticketBand path")].map((p) => p.getAttribute("d")),
        rosette: [...document.querySelectorAll("#ticketEngrave .t-rosette path")].map((p) => p.getAttribute("d")),
        bandBox: document.getElementById("ticketBand").getBoundingClientRect().toJSON(),
        head: document.querySelector("#ticket .t-head").getBoundingClientRect().bottom,
        body: document.getElementById("ticketBody").getBoundingClientRect().top,
      };
    });
  };
  const taxi = await ticket("1976-taxi-driver"),
    rocky = await ticket("1976-rocky"),
    heat = await ticket("1995-heat"),
    casablanca = await ticket("1942-casablanca");
  // Its own engraving: a band under the head and a rosette in the paper, different for every film.
  for (const t of [taxi, rocky, heat, casablanca]) {
    assert.ok(t.band.length >= 5 && t.rosette.length >= 4, t.band.length + " lines, " + t.rosette.length + " rings");
    assert.ok(t.bandBox.height >= 8 && t.bandBox.top >= t.head - 1 && t.bandBox.bottom <= t.body + 1, "the band sits between the head and the film");
  }
  assert.notDeepEqual(taxi.band, rocky.band);
  assert.notDeepEqual(taxi.rosette, heat.rosette);
  // The same film again: the same engraving.
  assert.deepEqual((await ticket("1976-taxi-driver")).band, taxi.band);
  // Paper by decade: two films of the seventies share a stock, the nineties and the forties have their own.
  assert.deepEqual([taxi.stock, rocky.stock, heat.stock, casablanca.stock], ["1970", "1970", "1990", "1940"]);
  assert.equal(taxi.paper, rocky.paper);
  assert.equal(new Set([taxi.paper, heat.paper, casablanca.paper]).size, 3);
  // The band takes the decade's colour, and a winner's is brass whatever its decade.
  assert.notEqual(taxi.bandColour, heat.bandColour);
  assert.equal(rocky.bandColour, casablanca.bandColour, "both winners");
  assert.notEqual(rocky.bandColour, taxi.bandColour);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the envelope collects a mark for each milestone, and puts them away while a ticket is out", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  const marks = () => page.$$eval("#envMarks .mark", (m) => m.map((x) => [x.className.replace("mark mark-", ""), x.title]));
  assert.deepEqual(await marks(), [], "a new envelope has none");
  const watch = (n) =>
    page.evaluate((n) => {
      const { store, catalog } = window.kuvert.app;
      catalog.films.filter((f) => !catalog.isWinner(f) && !store.p.seen.has(f.id)).slice(0, n).forEach((f) => store.markSeen(f.id, true, { date: "2026-10-01" }));
    }, n);
  await watch(1);
  await page.waitForSelector("#envMarks .mark-waves");
  assert.deepEqual(await marks(), [["waves", "The first ticket"]]);
  await watch(24);
  await page.waitForSelector("#envMarks .mark-rek");
  assert.deepEqual(await marks(), [["waves", "The first ticket"], ["rek", "25 films watched"]]);
  assert.match(await page.textContent("#envMarks .mark-rek"), /R\s*Kuvert\s*Nr 025/);
  // Each sits on the envelope's front, inside it, clear of the name and the postmark.
  const boxes = await page.evaluate(() => {
    const box = (el) => el.getBoundingClientRect().toJSON();
    return { env: box(document.getElementById("envelope")), marks: [...document.querySelectorAll("#envMarks .mark")].map(box), name: box(document.querySelector(".edition strong")), postmark: box(document.querySelector(".postmark")) };
  });
  const apart = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
  for (const m of boxes.marks) {
    assert.ok(m.width > 20 && m.left >= boxes.env.left && m.right <= boxes.env.right && m.top >= boxes.env.top && m.bottom <= boxes.env.bottom, "inside the envelope");
    assert.ok(apart(m, boxes.name) && apart(m, boxes.postmark), "clear of the name and the postmark");
  }
  // With a ticket out the envelope is a pocket, and the marks wait.
  await page.click("#drawBtn");
  await opened(page);
  await page.waitForFunction(() => getComputedStyle(document.getElementById("envMarks")).opacity === "0");
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the watched wall is a stamp album: your stars are the stamp's value, the day you watched it its postmark", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  await page.evaluate(() => {
    const { store } = window.kuvert.app;
    store.markSeen("1976-rocky", true, { date: "2026-11-14" });
    store.rate("1976-rocky", 4.5);
    store.markSeen("1995-heat", true, { date: "2026-03-07" });
    store.rate("1995-heat", 5);
    store.markSeen("1942-casablanca", true, { date: null }); // seen before Kuvert: no date, no stars
  });
  await page.evaluate(() => window.kuvert.app.router.show("library"));
  await page.locator("#watchedArchive > summary").click();
  await page.waitForSelector("#posterWall .wall-film");
  const stamps = await page.$$eval("#posterWall .wall-film", (tiles) =>
    Object.fromEntries(
      tiles.map((t) => {
        const cancel = t.querySelector(".stamp-cancel");
        return [
          t.dataset.film,
          {
            // What the stylesheet prints: the value on the stamp's foot, and the postmark's date.
            value: getComputedStyle(t.querySelector(".stamp-value"), "::after").content.replaceAll('"', ""),
            postmark: getComputedStyle(cancel).display === "none" ? null : getComputedStyle(cancel, "::before").content.replace(/"\s*"\\a"\s*"|\\a\s*/g, " ").replaceAll('"', "").trim(),
            name: t.getAttribute("aria-label"),
            words: t.innerText.replace(/\s+/g, " ").trim(),
          },
        ];
      }),
    ),
  );
  assert.deepEqual(stamps["1976-rocky"].value, "4½");
  assert.match(stamps["1976-rocky"].postmark, /^14\.11\s+2026$/);
  assert.equal(stamps["1995-heat"].value, "5");
  assert.match(stamps["1995-heat"].postmark, /^07\.03\s+2026$/);
  assert.deepEqual([stamps["1942-casablanca"].value, stamps["1942-casablanca"].postmark], ["", null], "no stars, no date: a mint stamp");
  // The print is not text in the page: a tile still reads as its title, its stars and its year.
  assert.equal(stamps["1976-rocky"].words, "Rocky ★★★★½ · 1976");
  // What a stamp is called has not changed, and it still opens the ticket.
  assert.equal(stamps["1976-rocky"].name, "Open your ticket for Rocky, 1976, 4.5 stars, ranked 2");
  // Giving a date later strikes the postmark.
  await page.evaluate(() => window.kuvert.app.store.setDate("1942-casablanca", "2026-01-02"));
  await page.waitForFunction(() => document.querySelector('#posterWall [data-film="1942-casablanca"] .stamp-cancel').dataset.day === "02.01");
  await page.locator('#posterWall [data-film="1995-heat"]').click();
  await page.waitForSelector("#ticket:not([hidden])");
  assert.match(await page.textContent("#pickTitle"), /Heat/);
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("the kurbits garland on Stats is painted in as you watch", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  await page.evaluate(() => window.kuvert.app.router.show("stats"));
  const paint = () => page.$$eval("#garland .bloom", (b) => b.map((x) => x.dataset.paint).join(""));
  assert.equal(await paint(), "00000000000", "eleven flowers, bare");
  const watch = (n) =>
    page.evaluate((n) => {
      const { store, catalog } = window.kuvert.app;
      catalog.films.filter((f) => !store.p.seen.has(f.id)).slice(0, n).forEach((f) => store.markSeen(f.id, true, { date: "2026-10-01" }));
    }, n);
  // One film starts the first flower's stem.
  await watch(1);
  await page.waitForFunction(() => document.querySelector("#garland .bloom").dataset.paint === "1");
  // 25 of 275: four steps of forty-four, the whole first flower.
  await watch(24);
  await page.waitForFunction(() => document.querySelector("#garland .bloom").dataset.paint === "4");
  assert.equal(await paint(), "40000000000");
  // Every film: every flower.
  await watch(275);
  await page.waitForFunction(() => [...document.querySelectorAll("#garland .bloom")].every((b) => b.dataset.paint === "4"));
  // The paint is real: a painted petal has a colour, a bare one has none.
  assert.equal(await page.isVisible("#garland"), true);
  assert.deepEqual(await problems(page), []);
  await context.close();
});
