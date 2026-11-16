// Takes the pictures the README shows (docs/pictures/), from this checkout, at phone size:
//   node tools/pictures.mjs [folder]
// Run it again when the look changes. The evening is always the same one, and so are the films watched,
// so the pictures only change when the app does.
//
// The films' real posters are TMDB's, which may be kept for six months and no longer, so a picture kept
// in the repository can't show them. The posters here are stand-ins drawn by this script: a colour, a
// shape and the film's title.
import { mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { serve } from "./serve.mjs";
import { POSTERS } from "../js/data/posters.js";
import { FILM_TABLE } from "../js/data/films.js";

const OUT = process.argv[2] || fileURLToPath(new URL("../docs/pictures", import.meta.url));
// A Wednesday evening in November, a film already watched that week.
const NOW = new Date("2026-11-18T20:10:00");
const TONIGHT = "1942-casablanca";
const PHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const film = new Map(Object.entries(POSTERS).map(([id, [, path]]) => [path, { id, ...FILM_TABLE[id] }]));
const seed = (text) => [...text].reduce((h, c) => Math.imul(h ^ c.codePointAt(0), 16777619) >>> 0, 2166136261);
const esc = (text) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** A stand-in poster: the film's title on a colour of its own, over one of four plain shapes. */
function standIn({ id, t, y }) {
  const n = seed(id),
    hue = n % 360,
    other = (hue + 150 + ((n >>> 9) % 60)) % 360,
    // As large as its longest word allows, and smaller for a long title.
    longest = Math.max(...t.split(/\s+/).map((word) => word.length)),
    size = Math.min(t.length > 30 ? 30 : t.length > 18 ? 36 : 46, Math.floor(244 / (longest * 0.6)));
  const shapes = [
    // A low sun over two hills.
    `<circle cx="210" cy="150" r="64" fill="hsl(${other} 78% 66%)"/><path d="M0 330 Q90 250 190 320 T300 290 V450 H0Z" fill="hsl(${hue} 42% 17%)"/><path d="M0 380 Q120 320 300 372 V450 H0Z" fill="hsl(${hue} 46% 11%)"/>`,
    // The beam of a projector.
    `<path d="M300 0 L-20 300 L120 450 Z" fill="hsl(${other} 70% 70%)" opacity=".34"/><path d="M300 0 L40 450 L170 450 Z" fill="hsl(${other} 80% 78%)" opacity=".4"/>`,
    // Rings in water.
    [150, 112, 78, 46, 18].map((r, i) => `<circle cx="96" cy="150" r="${r}" fill="none" stroke="hsl(${other} 76% ${52 + i * 7}%)" stroke-width="9"/>`).join(""),
    // A striped evening sky.
    [0, 1, 2, 3, 4].map((i) => `<rect y="${70 + i * 44}" width="300" height="${30 - i * 4}" fill="hsl(${(other + i * 9) % 360} 74% ${70 - i * 7}%)"/>`).join(""),
  ];
  return `<div id="poster" style="position:relative;width:300px;height:450px;overflow:hidden;background:linear-gradient(170deg,hsl(${hue} 52% 34%),hsl(${hue} 58% 13%))">
    <svg viewBox="0 0 300 450" style="position:absolute;inset:0;width:300px;height:450px">${shapes[(n >>> 5) % shapes.length]}</svg>
    <div style="position:absolute;inset:12px;border:1.5px solid rgb(250 242 224 / .5)"></div>
    <div style="position:absolute;left:28px;top:26px;font:700 15px/1 'Courier Prime',monospace;letter-spacing:.3em;color:rgb(250 242 224 / .88)">${y}</div>
    <div style="position:absolute;left:28px;right:28px;bottom:32px;font:700 ${size}px/1.04 'Playfair Display',serif;color:#faf2e0;text-shadow:0 2px 14px rgb(0 0 0 / .5)">${esc(t)}</div>
  </div>`;
}

const { url, server } = await serve(0);
const browser = await chromium.launch();
try {
  // The stand-ins are drawn on a page of the site's own, in its own type.
  const easel = await (await browser.newContext({ viewport: { width: 300, height: 450 } })).newPage();
  await easel.goto(url + "/tools/blank.html");
  await easel.addStyleTag({ url: url + "/css/fonts.css" });
  const drawn = new Map();
  async function poster(path) {
    if (!drawn.has(path)) {
      await easel.evaluate((html) => void (document.body.innerHTML = html), "<style>body{margin:0}</style>" + standIn(film.get(path)));
      await easel.evaluate(() => document.fonts.ready);
      drawn.set(path, await easel.locator("#poster").screenshot({ type: "png" }));
    }
    return drawn.get(path);
  }

  const context = await browser.newContext({ ...PHONE, colorScheme: "dark", reducedMotion: "reduce", serviceWorkers: "block" });
  await context.clock.setFixedTime(NOW);
  // Nothing leaves the machine. TMDB's picture server is played by the stand-ins.
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  let chain = Promise.resolve();
  await context.route("https://image.tmdb.org/**", (route) => {
    const path = "/" + new URL(route.request().url()).pathname.split("/").pop();
    if (!film.has(path)) return route.abort();
    // One at a time: there is one easel.
    chain = chain.then(async () => route.fulfill({ status: 200, contentType: "image/png", headers: { "access-control-allow-origin": "*" }, body: await poster(path) })).catch(() => route.abort().catch(() => {}));
  });
  // Kuvert's posters, as fresh on that evening as if the monthly refresh had just run.
  await context.route("**/js/data/posters.js", async (route) => {
    const response = await route.fetch();
    route.fulfill({ response, body: (await response.text()).replace(/POSTERS_AT = "[^"]*"/, 'POSTERS_AT = "' + NOW.toISOString().slice(0, 10) + '"') });
  });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("kuvert:welcomed", "1");
      localStorage.setItem("kuvert:installHint", "1");
    } catch {}
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const open = async () => {
    await page.goto(url + "/", { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.kuvert?.app);
    await page.evaluate(() => document.fonts.ready);
  };
  const settle = async (ms = 500) => {
    await page.waitForLoadState("networkidle");
    await page.waitForFunction(() => document.getAnimations().every((a) => a.constructor.name !== "CSSTransition" || a.playState !== "running"));
    await page.waitForTimeout(ms);
  };
  const show = (name) => page.evaluate((name) => window.kuvert.app.router.show(name), name);
  /** Scrolls so that the element's top sits `y` pixels down the screen. */
  const bring = (selector, y) => page.evaluate(([selector, y]) => scrollTo(0, document.querySelector(selector).getBoundingClientRect().top + scrollY - y), [selector, y]);
  mkdirSync(OUT, { recursive: true });
  const shoot = async (name) => {
    const file = join(OUT, name + ".jpg");
    await page.screenshot({ path: file, type: "jpeg", quality: 80 });
    console.log(name + ".jpg", Math.round(statSync(file).size / 1024) + " KB");
  };

  // Half a year of film nights: a film every few days, most with stars, a dozen seen before Kuvert, and
  // a verdict on some of the winners. Tonight's film is still in the envelope.
  await open();
  await page.evaluate((tonight) => {
    const { app } = window.kuvert,
      { store, catalog } = app;
    const day = (ago) => new Date(Date.now() - ago * 86400e3).toISOString().slice(0, 10);
    const films = catalog.films.filter((f) => f.id !== tonight);
    films.filter((_, i) => i % 5 === 0).slice(0, 44).forEach((f, i) => {
      store.markSeen(f.id, true, { date: day(i * 4 + 1) });
      if (i % 6 !== 5) store.rate(f.id, ((i * 7) % 9) / 2 + 1);
    });
    films.filter((_, i) => i % 5 === 2).slice(0, 12).forEach((f) => store.markSeen(f.id, true, { date: null }));
    const winners = catalog.films.filter((f) => store.p.seen.has(f.id) && catalog.isWinner(f));
    winners.slice(0, 3).forEach((f, i) => app.setVerdict(f.id, ["yes", "no", "unsure"][i]));
  }, TONIGHT);

  // 1. Tonight: the sealed envelope. The reminder to save a copy has been answered: not now.
  await open();
  await settle();
  if (await page.isVisible("#keepCopy")) await page.click("#keepCopyLater");
  await settle();
  await shoot("envelope");

  // 2. The ticket, out of the envelope, in the light of its poster.
  await page.evaluate((id) => window.kuvert.app.stage.openFilm(id), TONIGHT);
  await page.waitForFunction(() => !window.kuvert.app.stage.busy && window.kuvert.app.stage.open);
  await page.waitForFunction(() => document.documentElement.hasAttribute("data-lit"));
  await bring("#ticket", 64);
  await settle(900);
  await shoot("ticket");

  // 3. The Library's album of watched films: every one a stamp.
  await show("library");
  await settle();
  await page.click("#watchedArchive > summary");
  await page.waitForSelector("#posterWall .wall-film");
  await bring("#watchedArchive", 76);
  await page.waitForFunction(() => [...document.querySelectorAll("#posterWall img")].filter((img) => img.naturalWidth > 0).length >= 9);
  await settle(900);
  await shoot("album");

  // 4. Stats: the watchthrough so far, a light for every film.
  await show("stats");
  await settle();
  await page.evaluate(() => scrollTo(0, 0));
  await settle(700);
  await shoot("stats");

  if (errors.length) throw new Error("The page reported errors:\n" + errors.join("\n"));
} finally {
  await browser.close();
  server.close();
}
