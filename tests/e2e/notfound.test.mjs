// An address that doesn't exist: GitHub Pages serves 404.html there, at any depth. It must find its
// own styles and the way back, with nothing blocked by its policy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { env, newContext } from "./helpers.mjs";

test("a missing page shows the crying Carolean, styled, with the way back to Kuvert", async () => {
  const context = await newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
  const res = await page.goto(env.url + "/no/such/page");
  assert.equal(res.status(), 404);
  await page.waitForLoadState("load");
  const seen = await page.evaluate(() => ({
    base: document.baseURI,
    title: getComputedStyle(document.querySelector(".nf-title")).fontFamily,
    art: document.querySelector("svg.nf-art title").textContent,
    wide: document.documentElement.scrollWidth,
    problems: window.__problems,
  }));
  assert.equal(seen.base, env.url + "/", "links start from the site's own folder");
  assert.match(seen.title, /Cormorant/, "the page's stylesheets load");
  assert.match(seen.art, /Carolean/);
  assert.ok(seen.wide <= 390, "no sideways scrolling on a phone");
  assert.deepEqual(seen.problems, [], "nothing blocked by the page's policy");
  assert.equal(await page.textContent(".nf-code"), "404");
  await page.click(".nf-home");
  await page.waitForFunction(() => window.kuvert?.app);
  assert.equal(new URL(page.url()).pathname, "/");
  assert.deepEqual(errors, []);
  await context.close();
});
