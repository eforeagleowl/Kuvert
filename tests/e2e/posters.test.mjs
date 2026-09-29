// Posters for watched films: the Library's list and poster wall fetch what's missing from TMDB and show
// it, against a stand-in TMDB. Nothing leaves the machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { newContext, openPage, problems } from "./helpers.mjs";

const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*" };
// A 2×3 PNG, served for every poster.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAADCAIAAAA2iEnWAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==", "base64");

// Every title is found once, except Hamlet, which has two films that year: that one needs you to pick.
// `busy`: how many searches TMDB turns away first, as it does when it gets too many requests.
async function standInTmdb(context, { busy = 0 } = {}) {
  const films = new Map(),
    images = [];
  const id = (s) => ([...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17) % 900000) + 1000;
  await context.route("https://api.themoviedb.org/**", (route) => {
    const req = route.request(),
      u = new URL(req.url()),
      path = u.pathname.replace(/^\/3/, "");
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", headers: CORS, body: JSON.stringify(body) });
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (path === "/configuration") return json({ images: { secure_base_url: "https://image.tmdb.org/t/p/" } });
    if (path === "/search/movie") {
      if (busy > 0) return busy--, json({ status_message: "Too many requests" }, 429);
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
  await context.route("https://image.tmdb.org/**", (route) => {
    images.push(route.request().url());
    route.fulfill({ status: 200, contentType: "image/png", headers: CORS, body: PNG });
  });
  return images;
}

test("watched films get their posters in the Library, and a film that needs a match says so", async () => {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const context = await newContext({ viewport });
    const images = await standInTmdb(context);
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
    // Every poster is asked for at Kuvert's own address, never one Kuvert Classic's plain copies share.
    assert.ok(images.length > 8 && images.every((u) => u.endsWith("?cors=1")), images.find((u) => !u.endsWith("?cors=1")));
    assert.deepEqual(await problems(page), []);
    await context.close();
  }
});

test("when TMDB turns lookups away, the poster wall says so, and carries on by itself afterwards", async () => {
  const context = await newContext();
  await standInTmdb(context, { busy: 6 });
  const page = await openPage(context, "/");
  await page.evaluate(() => {
    document.getElementById("tmdbTok").value = "eyJhbGciOiJIUzI1NiJ9.test-read-access-token.signature-for-tests-only";
    document.getElementById("tmdbSave").click();
  });
  await page.waitForFunction(() => window.kuvert.app.details.connected);
  await page.evaluate(() => {
    const { store, catalog } = window.kuvert.app;
    for (const f of catalog.films.slice(0, 6)) store.markSeen(f.id, true);
  });
  await page.click('a[data-route="library"]:visible');
  await page.click("#watchedArchive > summary");
  // Three refusals in a row: lookups pause, and the wall says what TMDB said.
  await page.waitForFunction(() => /Paused: Too many requests/.test(document.getElementById("posterWallStatus").textContent), null, { timeout: 10000 });
  // The pause ends (here at once, instead of in 30 seconds) and every poster comes in, with no retry button pressed.
  await page.evaluate(() => window.kuvert.app.library.resumeLookups());
  await page.waitForFunction(() => document.getElementById("posterWallStatus").textContent === "6 of 6 posters", null, { timeout: 15000 });
  assert.deepEqual(await problems(page), []);
  await context.close();
});

test("with no TMDB key, the list's own posters show on the wall, in the rows and on the ticket, until they're too old", async () => {
  const day = (ago) => new Date(Date.now() - ago * 86400000).toISOString().slice(0, 10);
  for (const [at, fresh] of [[day(3), true], [day(200), false]]) {
    const context = await newContext();
    const images = [],
      api = [];
    await context.route("https://image.tmdb.org/**", (route) => {
      images.push(route.request().url());
      route.fulfill({ status: 200, contentType: "image/png", headers: CORS, body: PNG });
    });
    await context.route("https://api.themoviedb.org/**", (route) => {
      api.push(route.request().url());
      route.abort();
    });
    // The list's posters, as the monthly refresh writes them: the first nine films.
    await context.route("**/js/data/posters.js", async (route) => {
      const { FILMS } = await import("../../js/data/catalogue.js");
      const posters = Object.fromEntries(FILMS.slice(0, 9).map((f, i) => [f.id, [1000 + i, "/list" + i + ".jpg"]]));
      route.fulfill({ status: 200, contentType: "text/javascript", body: `export const POSTERS_AT = ${JSON.stringify(at)};\nexport const POSTERS = ${JSON.stringify(posters)};\n` });
    });
    const page = await openPage(context, "/");
    const { watched, onTicket } = await page.evaluate(() => {
      const { store, catalog, stage } = window.kuvert.app;
      const watched = catalog.films.slice(0, 7).map((f) => f.id);
      for (const id of watched) store.markSeen(id, true);
      store.pick(catalog.films[8].id);
      stage.syncPick();
      return { watched, onTicket: catalog.films[8].id };
    });
    // Tonight's ticket.
    await page.click("#drawBtn");
    await page.waitForFunction(() => window.kuvert.app.stage.open && !window.kuvert.app.stage.busy);
    assert.equal(await page.evaluate(() => window.kuvert.app.store.p.current), onTicket);
    if (fresh) {
      await page.waitForFunction(() => document.getElementById("poster").naturalWidth > 0);
      assert.match(await page.getAttribute("#poster", "src"), /\/t\/p\/w342\/list8\.jpg\?cors=1$/);
      assert.match(await page.textContent("#infoStatus"), /Connect TMDB in Settings for the runtime, cast and where to stream it/);
    } else {
      assert.equal(await page.isVisible("#poster"), false);
      assert.match(await page.textContent("#infoStatus"), /Connect TMDB in Settings for the poster and details/);
    }
    // The Library's wall and rows.
    await page.click('a[data-route="library"]:visible');
    await page.click("#watchedArchive > summary");
    if (fresh) {
      await page.waitForFunction(() => document.querySelectorAll("#posterWall .wall-film img").length === 7, null, { timeout: 10000 });
      assert.equal(await page.textContent("#posterWallStatus"), "7 of 7 posters");
      await page.evaluate(() => document.getElementById("seenList").scrollIntoView({ block: "center" }));
      await page.waitForFunction(() => [...document.querySelectorAll("#seenList .thumb img")].some((i) => i.naturalWidth > 0), null, { timeout: 10000 });
    } else {
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => document.querySelectorAll("#posterWall .wall-film img, #seenList .thumb").length), 0);
      assert.equal(await page.textContent("#posterWallStatus"), "Connect TMDB in Settings for posters.");
    }
    assert.deepEqual(api, [], "nothing is asked of TMDB's API without a key");
    assert.ok(images.every((u) => u.endsWith("?cors=1")));
    assert.equal(images.length > 0, fresh);
    assert.deepEqual(await problems(page), []);
    // Nothing from the list's posters is written into your progress.
    assert.deepEqual(await page.evaluate((ids) => ids.map((id) => window.kuvert.app.store.p.posterPaths[id]), watched), watched.map(() => undefined));
    await context.close();
  }
});
