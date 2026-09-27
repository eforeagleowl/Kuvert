// TMDB and GitHub sync, held to Kuvert Classic, which has run against the real services. Both apps do
// the same things against the same stand-in servers, and must send the same requests (method, address,
// credentials, body) and save the same results. Nothing leaves the machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { newContext, openPage } from "./helpers.mjs";

const golden = JSON.parse(readFileSync(new URL("../fixtures/golden.json", import.meta.url), "utf8"));
const TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.test-read-access-token.signature-for-tests-only";
const GH_TOKEN = "ghp_testTokenForKuvertParityChecks000000";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET, POST, PATCH, OPTIONS" };

// Waits until no request has arrived for `quiet` ms.
async function settle(log, { quiet = 900, timeout = 90000 } = {}) {
  const end = Date.now() + timeout;
  let seen = -1,
    since = Date.now();
  while (Date.now() < end) {
    if (log.length !== seen) (seen = log.length), (since = Date.now());
    else if (Date.now() - since >= quiet) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Requests never settled (" + log.length + " so far).");
}
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 17) % 900000 + 1000;
const json = (route, body, status = 200) => route.fulfill({ status, contentType: "application/json", headers: CORS, body: JSON.stringify(body) });
function describe(req) {
  const u = new URL(req.url()),
    params = [...u.searchParams].sort(([a], [b]) => a.localeCompare(b));
  return { method: req.method(), path: u.pathname, params, headers: req.headers() };
}

// A small TMDB: every title is found once, except a few with two exact matches (to exercise choices).
function tmdbServer() {
  const log = [],
    films = new Map();
  const AMBIGUOUS = new Set(["Hamlet", "Heat", "Crash"]);
  async function handle(route) {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const d = describe(req);
    log.push(`${d.method} ${d.path}?${d.params.map(([k, v]) => k + "=" + v).join("&")} auth=${d.headers.authorization || "-"}`);
    const u = new URL(req.url()),
      p = u.pathname.replace(/^\/3/, "");
    if (p === "/configuration") return json(route, { images: { secure_base_url: "https://image.tmdb.org/t/p/" } });
    if (p === "/watch/providers/regions") return json(route, { results: [{ iso_3166_1: "US", english_name: "United States", native_name: "United States" }, { iso_3166_1: "SE", english_name: "Sweden", native_name: "Sverige" }] });
    if (p === "/watch/providers/movie") return json(route, { results: [{ provider_id: 8, provider_name: "Netflix", display_priority: 1 }, { provider_id: 337, provider_name: "Disney Plus", display_priority: 2 }] });
    if (p === "/search/movie") {
      const q = u.searchParams.get("query"),
        y = u.searchParams.get("primary_release_year") || "1999";
      const make = (n) => {
        const id = hash(q + "|" + y + "|" + n);
        films.set(id, { title: q, year: y });
        return { id, title: q, original_title: q, release_date: y + "-06-01", poster_path: "/p" + id + ".jpg", popularity: 10 - n };
      };
      return json(route, { page: 1, results: AMBIGUOUS.has(q) ? [make(0), make(1)] : [make(0)] });
    }
    const m = p.match(/^\/movie\/(\d+)$/);
    if (m && films.has(Number(m[1]))) {
      const id = Number(m[1]),
        f = films.get(id);
      return json(route, {
        id,
        title: f.title,
        original_title: f.title,
        release_date: f.year + "-06-01",
        runtime: 80 + (id % 90),
        poster_path: "/p" + id + ".jpg",
        backdrop_path: "/b" + id + ".jpg",
        overview: "A film.",
        tagline: "A tagline.",
        budget: 1000000 * (id % 7),
        revenue: 3000000 * (id % 5),
        genres: [{ id: 18, name: "Drama" }, ...(id % 2 ? [{ id: 35, name: "Comedy" }] : []), ...(id % 3 ? [] : [{ id: 53, name: "Thriller" }])],
        credits: { cast: [{ name: "Actor " + id, character: "Lead" }], crew: [{ job: "Director", name: "Director " + id }] },
        "watch/providers": { results: { US: { link: "https://www.themoviedb.org/movie/" + id + "/watch", flatrate: id % 3 ? [] : [{ provider_id: 8, provider_name: "Netflix" }] } } },
        release_dates: { results: [{ iso_3166_1: "US", release_dates: [{ certification: "PG", type: 3 }] }] },
      });
    }
    return json(route, { status_message: "Not found" }, 404);
  }
  return { log, handle };
}

// A small GitHub with one account's gists.
function githubServer() {
  const log = [],
    gists = new Map();
  const view = (id) => {
    const g = gists.get(id);
    return { id, description: g.description, public: g.public, files: Object.fromEntries(Object.entries(g.files).map(([name, f]) => [name, { filename: name, content: f.content, truncated: false }])) };
  };
  // Progress files are compared without their timestamps (and the rebuild's per-film sync stamps).
  const steady = (name, content) => {
    if (!name.endsWith(".json")) return content;
    const { saved, stamps, ...rest } = JSON.parse(content);
    return rest;
  };
  async function handle(route) {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const d = describe(req),
      body = req.postData() ? JSON.parse(req.postData()) : null;
    log.push({
      request: `${d.method} ${d.path}?${d.params.map(([k, v]) => k + "=" + v).join("&")}`,
      headers: { authorization: d.headers.authorization, accept: d.headers.accept, version: d.headers["x-github-api-version"], type: d.headers["content-type"] || null },
      body: body && { ...body, files: body.files && Object.fromEntries(Object.entries(body.files).map(([n, f]) => [n, f && steady(n, f.content)])) },
    });
    if (d.path === "/gists" && d.method === "GET") return json(route, [...gists.keys()].map(view));
    if (d.path === "/gists" && d.method === "POST") {
      const id = "gist" + (gists.size + 1);
      gists.set(id, { description: body.description, public: body.public, files: body.files });
      return json(route, view(id), 201);
    }
    const m = d.path.match(/^\/gists\/(\w+)$/);
    if (m && gists.has(m[1])) {
      if (d.method === "PATCH") Object.assign(gists.get(m[1]).files, body.files);
      return json(route, view(m[1]));
    }
    return json(route, { message: "Not Found" }, 404);
  }
  return { log, handle };
}

async function run(path, server, host, act) {
  const context = await newContext();
  await context.addInitScript(() => localStorage.setItem("kuvert:welcomed", "1"));
  await context.route(host, (r) => server.handle(r));
  await context.route("https://image.tmdb.org/**", (r) => r.abort());
  const page = await openPage(context, path);
  const out = await act(page);
  await context.close();
  return out;
}
function sameRequests(label, a, b) {
  const sa = [...a].sort(),
    sb = [...b].sort();
  const onlyA = sa.filter((x) => !sb.includes(x)),
    onlyB = sb.filter((x) => !sa.includes(x));
  assert.deepEqual({ onlyClassic: onlyA.slice(0, 5), onlyNew: onlyB.slice(0, 5) }, { onlyClassic: [], onlyNew: [] }, label);
  assert.equal(sa.length, sb.length, label + ": the same number of requests");
}

test("TMDB: connecting and loading every film sends what Kuvert Classic sends, and saves the same details", async () => {
  const results = {};
  for (const [name, path] of [["classic", "/classic/"], ["new", "/"]]) {
    const server = tmdbServer();
    results[name] = await run(path, server, "https://api.themoviedb.org/**", async (page) => {
      await page.evaluate((t) => {
        document.getElementById("tmdbTok").value = t;
        document.getElementById("tmdbSave").click();
      }, TMDB_TOKEN);
      await settle(server.log);
      // The button turns on at the next render; both apps check the credential themselves.
      await page.evaluate(() => {
        const b = document.getElementById("loadAll");
        b.disabled = false;
        b.click();
      });
      await settle(server.log, { quiet: 2000 });
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kuvert:v4")));
      const steady = (byRegion) => Object.fromEntries(Object.entries(byRegion || {}).map(([r, v]) => [r, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, { ...x, at: 0 }]))]));
      return {
        requests: server.log,
        details: { runtimes: saved.runtimes, posterPaths: saved.posterPaths, matches: saved.matches, moodSuggestions: saved.moodSuggestions, availability: steady(saved.availability) },
        token: await page.evaluate(() => localStorage.getItem("envelope:tmdb")),
      };
    });
  }
  const { classic, new: next } = results;
  assert.ok(classic.requests.length > 400, "every film was looked up (" + classic.requests.length + " requests)");
  const found = Object.keys(classic.details.runtimes).length;
  assert.ok(found > 200 && found < 250, "most films matched, the ambiguous ones wait for a choice (" + found + ")");
  sameRequests("TMDB requests", classic.requests, next.requests);
  assert.deepEqual(next.details, classic.details);
  assert.equal(next.token, TMDB_TOKEN);
  assert.equal(classic.token, TMDB_TOKEN);
});

test("GitHub sync: connecting and syncing sends what Kuvert Classic sends", async () => {
  const results = {};
  for (const [name, path] of [["classic", "/classic/"], ["new", "/"]]) {
    const server = githubServer();
    results[name] = await run(path, server, "https://api.github.com/**", async (page) => {
      // The same progress in both, written by Kuvert Classic itself.
      await page.evaluate((save) => localStorage.setItem("kuvert:v4", save), golden.builtin.full.browser);
      await page.reload();
      await page.waitForLoadState("load");
      await page.evaluate((t) => {
        document.getElementById("syncToken").value = t;
        document.getElementById("syncConnect").click();
      }, GH_TOKEN);
      await settle(server.log);
      await page.evaluate(() => document.getElementById("syncNow").click());
      await settle(server.log);
      const cfg = await page.evaluate(() => JSON.parse(localStorage.getItem("kuvert:sync")));
      return { log: server.log, cfg: { token: cfg.token, gistId: cfg.gistId, files: Object.keys(cfg.last || {}) } };
    });
  }
  const { classic, new: next } = results;
  assert.ok(classic.log.length >= 3, "connect found no gist, made one and synced");
  assert.deepEqual(
    next.log.map((e) => e.request),
    classic.log.map((e) => e.request),
    "the same requests in the same order",
  );
  assert.deepEqual(next.log, classic.log, "the same credentials, headers and bodies");
  assert.deepEqual(next.cfg, classic.cfg);
});
