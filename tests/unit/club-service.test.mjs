// The site's film club server setting, and the tool that changes it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CLUB_SERVICE } from "../../js/club/service.js";
import { clubEndpoint } from "../../js/club/client.js";
import { pointAt } from "../../tools/club-service.mjs";

const read = (path) => readFileSync(new URL("../../" + path, import.meta.url), "utf8");
const service = read("js/club/service.js"),
  html = read("index.html");
const connect = (page) => page.match(/connect-src ([^;"]*)/)[1].split(" ");

test("the site ships pointed at no club server, or at one its security policy allows", () => {
  if (!CLUB_SERVICE) return;
  assert.equal(clubEndpoint(CLUB_SERVICE), CLUB_SERVICE);
  assert.ok(CLUB_SERVICE.startsWith("https://"));
  assert.ok(connect(html).includes(CLUB_SERVICE), "index.html's connect-src allows " + CLUB_SERVICE);
});

test("the tool points the site at one club server, moves it, and turns it off, leaving the rest of the policy", () => {
  const before = connect(html).filter((s) => s !== CLUB_SERVICE);
  const on = pointAt("https://kuvert-production.up.railway.app", { service, html });
  assert.match(on.service, /export const CLUB_SERVICE = "https:\/\/kuvert-production\.up\.railway\.app";/);
  assert.deepEqual(connect(on.html), ["'self'", "https://kuvert-production.up.railway.app", ...before.slice(1)]);
  const moved = pointAt("https://club.example/", { ...on });
  assert.deepEqual(connect(moved.html), ["'self'", "https://club.example", ...before.slice(1)], "the old address goes");
  const off = pointAt("off", { ...moved });
  assert.match(off.service, /export const CLUB_SERVICE = "";/);
  assert.deepEqual(connect(off.html), before);
  assert.equal(off.html.replace(/connect-src [^;"]*/, ""), html.replace(/connect-src [^;"]*/, ""), "nothing else in the page changes");
});

test("the tool takes only a bare service origin", () => {
  for (const bad of ["kuvert.up.railway.app", "https://club.example/api", "https://club.example/?x=1", "http://club.example"])
    assert.throws(() => pointAt(bad, { service, html }), /service/i, bad);
});
