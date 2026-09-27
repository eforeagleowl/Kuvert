// Shared set-up for the browser tests: one static server and one Chromium per test file.
// Every page is watched for script errors, console errors and CSP / Trusted Types violations.
import { after, before } from "node:test";
import { chromium } from "playwright";
import { serve } from "../../tools/serve.mjs";

export const env = { url: "", server: null, browser: null };

before(async () => {
  Object.assign(env, await serve());
  env.browser = await chromium.launch();
});
after(async () => {
  await env.browser?.close();
  env.server?.closeAllConnections?.();
  env.server?.close();
});

/** A fresh profile. Service workers are off unless a test is about them. */
export async function newContext({ serviceWorkers = "block", viewport = { width: 1280, height: 900 }, welcomed = true } = {}) {
  const context = await env.browser.newContext({ serviceWorkers, viewport, reducedMotion: "reduce" });
  // Nothing leaves the machine: TMDB, GitHub and fonts from elsewhere are all refused.
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  await context.addInitScript((welcomed) => {
    window.__problems = [];
    document.addEventListener("securitypolicyviolation", (e) => window.__problems.push("CSP: " + e.violatedDirective + " " + (e.blockedURI || "")));
    if (welcomed && location.pathname.includes("/next/")) localStorage.setItem("kuvert:welcomed", "1");
  }, welcomed);
  return context;
}

/** Opens a page and collects everything that went wrong on it. */
export async function openPage(context, path) {
  const page = await context.newPage();
  page.problems = [];
  page.on("pageerror", (e) => page.problems.push("pageerror: " + e.message));
  page.on("console", (m) => m.type() === "error" && !/net::ERR_FAILED|Failed to load resource/.test(m.text()) && page.problems.push("console: " + m.text()));
  await go(page, path);
  return page;
}

export async function go(page, path) {
  await page.goto(env.url + path);
  if (path.startsWith("/next/")) await page.waitForFunction(() => window.kuvert?.app);
  else await page.waitForFunction(() => typeof encode === "function" && document.readyState === "complete");
}

/** Script errors, console errors and policy violations seen so far. */
export async function problems(page) {
  const inPage = await page.evaluate(() => window.__problems || []).catch(() => []);
  return [...page.problems, ...inPage];
}

/** The rebuild's progress, as plain JSON. */
export const nextProgress = (page) =>
  page.evaluate(() => {
    const p = window.kuvert.app.store.p;
    return { seen: [...p.seen].sort(), dates: p.dates, reviews: p.reviews, skipped: [...p.skipped].sort(), rankings: p.rankings, current: p.current };
  });

/** The classic app's progress, as the same plain JSON. */
export const classicProgress = (page) =>
  page.evaluate(() => ({ seen: [...seen].sort(), dates, reviews, skipped: [...skipped].sort(), rankings, current: current?.id ?? null }));
