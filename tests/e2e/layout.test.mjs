// Phones: no page is ever wider than the screen, so nothing slides sideways. Checked with the clipping
// safety net (main, .appbar { overflow-x: clip }) switched off, so a real overflow can't hide behind it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { env, newContext, openPage, problems } from "./helpers.mjs";
import { CURATED_COLLECTIONS } from "../../js/data/curated.js";

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAIAAAA2iEnWAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64");

// A stand-in TMDB with long names everywhere, so tickets and rows are as full as they get.
async function fullTmdb(context) {
  const films = new Map();
  const id = (s) => ([...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17) % 900000) + 1000;
  await context.route("https://api.themoviedb.org/**", (route) => {
    const req = route.request(),
      u = new URL(req.url()),
      path = u.pathname.replace(/^\/3/, "");
    const json = (body) => route.fulfill({ status: 200, contentType: "application/json", headers: CORS, body: JSON.stringify(body) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (path === "/configuration") return json({ images: { secure_base_url: "https://image.tmdb.org/t/p/" } });
    if (path === "/search/movie") {
      const q = u.searchParams.get("query"),
        y = u.searchParams.get("primary_release_year"),
        m = id(q + y);
      films.set(m, { q, y });
      return json({ results: [{ id: m, title: q, original_title: q, release_date: y + "-06-01", poster_path: "/p" + m + ".jpg" }] });
    }
    const m = path.match(/^\/movie\/(\d+)$/),
      f = m && films.get(Number(m[1]));
    if (f)
      return json({
        id: Number(m[1]),
        title: f.q,
        original_title: f.q,
        release_date: f.y + "-06-01",
        runtime: 187,
        tagline: "An unforgettable, sweeping and extraordinarily long tagline that has to wrap on a phone.",
        poster_path: "/p" + m[1] + ".jpg",
        backdrop_path: "/b" + m[1] + ".jpg",
        budget: 123456789,
        revenue: 987654321,
        genres: [{ name: "Drama" }, { name: "Romance" }, { name: "Science Fiction" }],
        credits: { cast: [{ name: "Maximilian Schellenberger-Longname" }, { name: "Christopher" }], crew: [{ job: "Director", name: "Apichatpong Weerasethakul" }] },
        "watch/providers": { results: { SE: { flatrate: [{ provider_name: "Netflix" }, { provider_name: "SVT Play" }], rent: [{ provider_name: "Google Play Movies" }, { provider_name: "SF Anytime" }] } } },
        release_dates: { results: [] },
      });
    return route.fulfill({ status: 404, headers: CORS, body: "{}" });
  });
  await context.route("https://image.tmdb.org/**", (route) => route.fulfill({ status: 200, contentType: "image/png", headers: CORS, body: PNG }));
}

async function widest(page) {
  return page.evaluate(() => {
    for (const el of document.querySelectorAll("main, .appbar")) el.style.setProperty("overflow-x", "visible", "important");
    // Past the right edge, and not inside a strip that's meant to be swiped sideways.
    const inScroller = (el) => {
      for (let p = el.parentElement; p && !p.matches("main, .appbar"); p = p.parentElement) if (getComputedStyle(p).overflowX !== "visible") return true;
      return false;
    };
    const W = document.documentElement.clientWidth,
      over = [...document.querySelectorAll("main *, .appbar *")]
        .filter((el) => el.getBoundingClientRect().right > W + 0.5 && el.getBoundingClientRect().width && !inScroller(el))
        .map((el) => (el.id ? "#" + el.id : el.tagName.toLowerCase() + "." + [...el.classList].join(".")));
    for (const el of document.querySelectorAll("main, .appbar")) el.style.removeProperty("overflow-x");
    return { width: document.documentElement.scrollWidth, W, over: over.slice(0, 5) };
  });
}

test("on phones, no page is wider than the screen", async () => {
  const cases = [
    ...[320, 360, 375, 390, 430].map((w) => [w, ""]),
    [360, "seagal"],
    [390, "seagal"],
    // The longest one-word name: Hitchcock Week in Swedish, Hitchcockveckan.
    [320, "envelope"],
    [390, "envelope"],
  ];
  for (const [w, mode] of cases) {
    const context = await env.browser.newContext({ viewport: { width: w, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block", reducedMotion: "reduce" });
    await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
    await context.addInitScript((mode) => {
      localStorage.setItem("kuvert:welcomed", "1");
      if (mode === "seagal") localStorage.setItem("kuvert:mode", mode);
      if (mode === "envelope") localStorage.setItem("kuvert:lang", "sv");
    }, mode);
    await fullTmdb(context);
    const page = await openPage(context, "/");
    if (mode === "envelope") {
      const hitchcock = CURATED_COLLECTIONS.find((c) => c.id === "curated-hitchcock");
      await Promise.all([page.waitForEvent("load"), page.evaluate((pack) => window.kuvert.app.journeys.start(pack), hitchcock)]);
      await page.waitForFunction(() => window.kuvert?.app?.list.id === "curated-hitchcock");
    }
    await page.evaluate(() => {
      document.getElementById("tmdbTok").value = "eyJhbGciOiJIUzI1NiJ9.test-read-access-token.signature-for-tests-only";
      document.getElementById("tmdbSave").click();
    });
    // Posters in every row, as with TMDB connected.
    await page.waitForFunction(() => window.kuvert.app.details.connected);
    await page.evaluate(() => {
      const { store, catalog } = window.kuvert.app;
      catalog.films.slice(40, 70).forEach((f, i) => {
        store.markSeen(f.id, true);
        store.rate(f.id, (i % 10) / 2 + 0.5);
      });
    });
    const at = w + "px" + (mode ? " " + mode : "");
    const check = async (where) => {
      const r = await widest(page);
      assert.ok(r.width <= r.W && !r.over.length, `${where} is ${r.width}px wide on a ${r.W}px screen (${at}); past the edge: ${r.over.join(", ")}`);
    };
    await check("Tonight");
    if (mode === "envelope") {
      const gap = await page.evaluate(() => document.querySelector(".postmark").getBoundingClientRect().left - document.querySelector(".edition strong").getBoundingClientRect().right);
      assert.ok(gap >= 0, `the envelope's name mark stops before the postmark (${at})`);
    }
    await page.click("#drawBtn");
    await page.waitForFunction(() => !window.kuvert.app.stage.busy && window.kuvert.app.stage.open);
    await page.waitForTimeout(400);
    await check("Tonight's ticket");
    await page.evaluate(() => window.kuvert.app.router.show("station"));
    await page.waitForFunction(() => window.kuvert.app.station.fontsReady && !window.kuvert.app.station.busy);
    await check("The station");
    await page.click("#stDraw");
    await page.waitForFunction(() => !window.kuvert.app.station.busy && !document.getElementById("stTicket").hidden);
    await check("The station's ticket");
    for (const name of ["library", "stats", "settings"]) {
      await page.evaluate((n) => window.kuvert.app.router.show(n), name);
      if (name === "library") await page.evaluate(() => (document.getElementById("watchedArchive").open = true));
      await page.waitForTimeout(500);
      await check(name[0].toUpperCase() + name.slice(1));
    }
    assert.deepEqual(await problems(page), []);
    await context.close();
  }
});

test("Kuvert is set in Playfair Display, Familjen Grotesk and Courier Prime, from its own files", async () => {
  const context = await newContext();
  const page = await openPage(context, "/");
  await page.click("#drawBtn");
  await page.waitForFunction(() => !window.kuvert.app.stage.busy && window.kuvert.app.stage.open);
  const seen = await page.evaluate(async () => {
    await document.fonts.ready;
    const first = (sel) => getComputedStyle(document.querySelector(sel)).fontFamily.split(",")[0].replaceAll('"', "").trim();
    return {
      faces: [first("#pickTitle"), first(".marquee-title"), first("body"), first("#drawSub"), first(".t-head"), first("#pickFacts")],
      loaded: ['600 20px "Playfair Display"', 'italic 500 20px "Playfair Display"', '16px "Familjen Grotesk"', '600 16px "Familjen Grotesk"', '12px "Courier Prime"'].filter((f) => !document.fonts.check(f, "Åäö 1917")),
      files: performance.getEntriesByType("resource").filter((r) => r.name.endsWith(".woff2")).map((r) => new URL(r.name).pathname.split("/").pop()),
      origins: [...new Set(performance.getEntriesByType("resource").map((r) => new URL(r.name).origin))],
    };
  });
  assert.deepEqual(seen.faces, ["Playfair Display", "Playfair Display", "Familjen Grotesk", "Familjen Grotesk", "Courier Prime", "Courier Prime"]);
  assert.deepEqual(seen.loaded, [], "every face the page asks for is there");
  assert.ok(seen.files.length >= 3 && seen.files.every((f) => /^(playfair|familjen|courier-prime|geist-arrows|noto-symbols)/.test(f)), seen.files.join(", "));
  assert.deepEqual(seen.origins, [env.url], "and nothing is fetched from anywhere else");
  // The envelope's name still fits beside the horse, and a long title still fits the ticket.
  const fits = await page.evaluate(() => {
    const within = (sel) => { const e = document.querySelector(sel), r = e.getBoundingClientRect(), p = e.parentElement.getBoundingClientRect(); return r.left >= p.left - 1 && r.right <= p.right + 1; };
    return { title: within("#pickTitle"), head: document.querySelector(".t-head").scrollWidth <= document.querySelector(".t-head").clientWidth + 1, page: document.documentElement.scrollWidth <= innerWidth };
  });
  assert.deepEqual(fits, { title: true, head: true, page: true });
  assert.deepEqual(await problems(page), []);
  await context.close();
});
