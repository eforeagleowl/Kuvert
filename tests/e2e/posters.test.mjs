// Posters for watched films: the Library's list and poster wall fetch what's missing from TMDB and show
// it, against a stand-in TMDB. Nothing leaves the machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newContext, openPage, problems } from "./helpers.mjs";

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
// A 2×3 PNG, served for every poster.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAIAAAA2iEnWAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64");

// Every title is found once, except Hamlet, which has two films that year: that one needs you to pick.
async function standInTmdb(context) {
  const films = new Map();
  const id = (s) => ([...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17) % 900000) + 1000;
  await context.route("https://api.themoviedb.org/**", (route) => {
    const req = route.request(),
      u = new URL(req.url()),
      path = u.pathname.replace(/^\/3/, "");
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", headers: CORS, body: JSON.stringify(body) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (path === "/configuration") return json({ images: { secure_base_url: "https://image.tmdb.org/t/p/" } });
    if (path === "/search/movie") {
      const q = u.searchParams.get("query"),
        y = u.searchParams.get("primary_release_year") || "1948";
      const make = (n) => {
        const m = id(q + y + n);
        films.set(m, { q, y });
        return { id: m, title: q, original_title: q, release_date: y + "-06-01", poster_path: "/p" + m + ".jpg" };
      };
      return json({ results: q === "Hamlet" ? [make(0), make(1)] : [make(0)] });
    }
    const m = path.match(/^\/movie\/(\d+)$/),
      f = m && films.get(Number(m[1]));
    if (f) return json({ id: Number(m[1]), title: f.q, original_title: f.q, release_date: f.y + "-06-01", runtime: 100, poster_path: "/p" + m[1] + ".jpg", genres: [], credits: { cast: [], crew: [] }, "watch/providers": { results: {} }, release_dates: { results: [] } });
    return json({ status_message: "Not found" }, 404);
  });
  await context.route("https://image.tmdb.org/**", (route) => route.fulfill({ status: 200, contentType: "image/png", headers: CORS, body: PNG }));
}

test("watched films get their posters in the Library, and a film that needs a match says so", async () => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const context = await newContext({ viewport });
    await standInTmdb(context);
    const page = await openPage(context, "/");
    await page.evaluate(() => {
      document.getElementById("tmdbTok").value = "eyJhbGciOiJIUzI1NiJ9.test-read-access-token.signature-for-tests-only";
      document.getElementById("tmdbSave").click();
    });
    await page.waitForFunction(() => window.kuvert.app.details.connected);
    // Watched without ever being opened on a ticket, so nothing about them is known yet.
    const watched = await page.evaluate(() => {
      const { store, catalog } = window.kuvert.app;
      const ids = [...catalog.films.slice(0, 7).map((f) => f.id), "1948-hamlet"];
      for (const id of ids) store.markSeen(id, true);
      return ids;
    });
    await page.click('a[data-route="library"]:visible');
    await page.click("#watchedArchive > summary");

    // Every poster on the wall is fetched and drawn: the ones on screen straight away, the rest as you scroll.
    const drawn = () =>
      page.evaluate(() => {
        const tiles = [...document.querySelectorAll("#posterWall .wall-film")].filter((t) => t.dataset.film !== "1948-hamlet");
        return tiles.length === 7 && tiles.every((t) => t.querySelector("img")?.naturalWidth > 0);
      });
    await page.waitForFunction(() => document.querySelectorAll("#posterWall .wall-film img").length === 7, null, { timeout: 10000 });
    for (let i = 0; i < 7 && !(await drawn()); i++) {
      await page.evaluate((i) => document.querySelectorAll("#posterWall .wall-film")[i].scrollIntoView({ block: "center" }), i);
      await page.waitForTimeout(150);
    }
    assert.ok(await drawn(), "every poster on the wall is drawn (" + viewport.width + "px wide)");
    const status = await page.textContent("#posterWallStatus");
    assert.match(status, /^7 of 8 posters · 1 needs you to pick the right movie/, status);
    // The list of watched films shows its small posters too.
    await page.evaluate(() => document.getElementById("seenList").scrollIntoView({ block: "center" }));
    await page.waitForFunction(() => [...document.querySelectorAll("#seenList .thumb img")].some((i) => i.naturalWidth > 0), null, { timeout: 10000 });
    const saved = await page.evaluate((ids) => ids.map((id) => window.kuvert.app.store.p.posterPaths[id]), watched);
    assert.ok(saved.slice(0, 7).every((p) => /^\/p\d+\.jpg$/.test(p)), "the paths are saved for next time");
    assert.equal(saved[7], undefined, "Hamlet waits for you to pick");

    // Open it from the wall, pick the right Hamlet on its ticket, and its poster joins the wall.
    await page.evaluate(() => document.querySelector('#posterWall [data-film="1948-hamlet"]').scrollIntoView({ block: "center" }));
    await page.click('#posterWall [data-film="1948-hamlet"]');
    await page.waitForSelector("#matchChoices:not([hidden]) button");
    await page.click("#matchChoices button");
    await page.waitForFunction(() => window.kuvert.app.store.p.posterPaths["1948-hamlet"]);
    await page.click('a[data-route="library"]:visible');
    await page.evaluate(() => document.querySelector('#posterWall [data-film="1948-hamlet"]').scrollIntoView({ block: "center" }));
    await page.waitForFunction(() => document.querySelector('#posterWall [data-film="1948-hamlet"] img')?.naturalWidth > 0);
    assert.equal(await page.textContent("#posterWallStatus"), "8 of 8 posters");
    assert.deepEqual(await problems(page), []);
    await context.close();
  }
});
