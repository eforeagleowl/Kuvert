import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir, symlink, rm, stat, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { serveClub } from "../../server/server.mjs";
import { RoomStore } from "../../server/rooms.mjs";
import { ClubClient, ClubError, clubEndpoint, readClubInvite } from "../../js/club/client.js";

const films = [
  { id: "short", title: "A Short Film", year: 1950, runtime: 90, services: ["8", "svt"], servicesKnown: true },
  { id: "long", title: "A Long Film", year: 1960, runtime: 180, services: ["8"], servicesKnown: true },
  { id: "unknown", title: "A Discovery", year: 1970, runtime: null, services: [], servicesKnown: false },
  { id: "other", title: "Another Evening", year: 1980, runtime: 100, services: ["9"], servicesKnown: true },
];
async function fixture(t, options = {}) {
  const dir = await mkdtemp(join(tmpdir(), "kuvert-club-"));
  let service;
  t.after(async () => { await service?.close(); await rm(dir, { recursive: true, force: true }); });
  service = await serveClub({ dataFile: join(dir, "rooms.json"), ...options });
  return { dir, service, host: new ClubClient({ endpoint: service.url }), guest: new ClubClient({ endpoint: service.url }) };
}
const create = (host, extras = {}) => host.create({ name: "Filmkväll", memberName: "Anna", catalogue: films, ...extras });
const joinClub = (guest, result, extras = {}) => guest.join({ inviteToken: result.inviteToken, memberName: "Bo", ...extras });
const current = (client) => client.room.sessions.at(-1);

test("club invites join as guests and never grant host or other-member authority", async (t) => {
  const { host, guest, service } = await fixture(t);
  assert.deepEqual(await host.health(), { service: "kuvert-club", version: 1, club: true, metadata: false, retentionDays: 180 });
  const created = await create(host);
  assert.notEqual(created.inviteToken, host.credential.memberToken);
  await joinClub(guest, created, { host: true, memberId: host.credential.memberId });
  assert.equal(guest.room.members.find((m) => m.id === guest.credential.memberId).host, false);
  await assert.rejects(guest.propose({ filmId: "short" }), (e) => e.status === 403 && e.code === "host_only");
  await assert.rejects(guest.setCatalogue(films.slice(0, 1)), (e) => e.status === 403);
  await assert.rejects(guest.close(), (e) => e.status === 403);
  const unauthorized = await fetch(service.url + "/api/rooms/" + host.credential.roomId, { headers: { Authorization: "Bearer " + created.inviteToken } });
  assert.equal(unauthorized.status, 401);
  const publicView = JSON.stringify((await guest.refresh()).room);
  assert.ok(!publicView.includes("tokenHash") && !publicView.includes("inviteHash") && !publicView.includes(host.credential.memberToken));
  await guest.updateMember({ name: "Bosse", host: true, memberId: host.credential.memberId });
  assert.equal(guest.room.members.find((m) => m.host).name, "Anna");
  assert.equal(guest.room.members.find((m) => m.id === guest.credential.memberId).name, "Bosse");
  const missing = await fetch(service.url + "/api/rooms/" + host.credential.roomId);
  assert.equal(missing.status, 401);
});

test("eligibility combines everybody's time, watched films and known services", async (t) => {
  const { host, guest } = await fixture(t);
  const created = await create(host, { constraints: { maxMinutes: 120, services: [8], requireStreaming: true } });
  await joinClub(guest, created, { constraints: { maxMinutes: 100, services: ["svt"], requireStreaming: true } });
  assert.deepEqual(guest.room.eligible.map((f) => f.id), ["short"]);
  await assert.rejects(host.propose({ filmId: "long" }), (e) => e.status === 409 && e.code === "film_ineligible");
  await guest.updateMember({ constraints: { watchedIds: ["short"], maxMinutes: 100 } });
  assert.deepEqual(guest.room.eligible, []);
  await host.updateMember({ constraints: {} });
  assert.deepEqual(host.room.eligible.map((f) => f.id), ["other"]);
  await guest.updateMember({ constraints: {} });
  assert.equal(guest.room.eligible.length, 4);
});

test("each member agrees independently; stars and notes reveal together after every submission", async (t) => {
  const { host, guest, service } = await fixture(t);
  const created = await create(host);
  await joinClub(guest, created);
  await host.propose({ filmId: "short", startsAt: "2026-10-14T20:00:00Z", note: "Bring fika." });
  let session = current(host);
  assert.equal(session.state, "proposed");
  await assert.rejects(host.rate(session.id, { stars: 4 }), (e) => e.status === 409);
  await guest.agree(session.id, false);
  assert.equal(current(guest).state, "proposed");
  await guest.agree(session.id, true);
  assert.equal(current(guest).state, "watching");
  await host.rate(session.id, { stars: 4.5, note: "SECRET ANNA NOTE" });
  await guest.refresh();
  session = current(guest);
  assert.equal(session.state, "watching");
  assert.equal(session.ratings, undefined);
  assert.equal(session.ownRating, null);
  assert.ok(!JSON.stringify(guest.room).includes("SECRET ANNA NOTE"));
  assert.equal((await guest.scrapbook()).sessions.length, 0);
  // There is deliberately no host override that could peek at ratings.
  const reveal = await fetch(service.url + "/api/rooms/" + host.credential.roomId + "/sessions/" + session.id + "/reveal", { method: "POST", headers: { Authorization: "Bearer " + host.credential.memberToken } });
  assert.equal(reveal.status, 404);
  await guest.rate(session.id, { stars: 3, note: "BO'S NOTE" });
  assert.equal(current(guest).state, "revealed");
  assert.deepEqual(current(guest).ratings.map((r) => r.stars), [4.5, 3]);
  await host.refresh();
  assert.equal(current(host).ratings[1].note, "BO'S NOTE");
  assert.equal((await guest.scrapbook()).sessions.length, 1);
  assert.ok(!host.room.eligible.some((f) => f.id === "short"), "completed films leave the eligible pool");
  await assert.rejects(host.rate(session.id, { stars: 1 }), (e) => e.status === 409);
});

test("membership reconnection survives a restart and the disk holds only secret hashes", async (t) => {
  const { host, guest, service, dir } = await fixture(t);
  const created = await create(host);
  await joinClub(guest, created);
  await host.propose({ filmId: "short" });
  const sessionId = current(host).id;
  await guest.agree(sessionId);
  await host.rate(sessionId, { stars: 5, note: "Save me for the reveal." });
  const raw = await readFile(join(dir, "rooms.json"), "utf8");
  for (const secret of [created.inviteToken, host.credential.memberToken, guest.credential.memberToken]) assert.ok(!raw.includes(secret));
  assert.equal((await stat(join(dir, "rooms.json"))).mode & 0o777, 0o600);
  await service.close();
  const restarted = await serveClub({ dataFile: join(dir, "rooms.json") });
  t.after(() => restarted.close());
  const returningHost = new ClubClient({ endpoint: restarted.url, credential: host.credential });
  const returningGuest = new ClubClient({ endpoint: restarted.url, credential: guest.credential });
  await returningGuest.reconnect();
  assert.equal(current(returningGuest).ratings, undefined);
  await returningGuest.rate(sessionId, { stars: 4 });
  await returningHost.refresh();
  assert.equal(current(returningHost).ratings[0].note, "Save me for the reveal.");
});

test("leaving stops a member blocking reveal; joining later participates next evening", async (t) => {
  const { host, guest, service } = await fixture(t);
  const created = await create(host);
  await joinClub(guest, created);
  await host.propose({ filmId: "short" });
  const sessionId = current(host).id;
  const late = new ClubClient({ endpoint: service.url });
  await joinClub(late, created, { memberName: "Cecilia" });
  await assert.rejects(late.agree(sessionId), (e) => e.status === 403);
  await guest.agree(sessionId);
  await host.rate(sessionId, { stars: 4 });
  await guest.leave();
  assert.equal(current(guest).state, "revealed");
  await assert.rejects(guest.updateMember({ name: "New name" }), (e) => e.code === "inactive");
  await guest.reconnect();
  assert.equal(guest.room.members.find((m) => m.id === guest.credential.memberId).active, true);
  assert.equal(current(guest).participants.find((p) => p.id === guest.credential.memberId).participating, false);
  await host.close();
  await assert.rejects(late.refresh(), (e) => e.code === "room_missing");
});

test("pending choices respect changed constraints and host cancellation keeps private ratings private", async (t) => {
  const { host, guest } = await fixture(t);
  const created = await create(host);
  await joinClub(guest, created);
  await host.propose({ filmId: "long" });
  let sessionId = current(host).id;
  await guest.updateMember({ constraints: { maxMinutes: 100 } });
  await guest.agree(sessionId);
  assert.equal(current(guest).state, "proposed");
  await assert.rejects(guest.cancel(sessionId), (e) => e.status === 403);
  await host.cancel(sessionId);
  await host.propose({ filmId: "short" });
  sessionId = current(host).id;
  await guest.agree(sessionId);
  await host.rate(sessionId, { stars: 2.5, note: "Still private" });
  await host.cancel(sessionId);
  await guest.refresh();
  assert.equal(current(guest).state, "cancelled");
  assert.equal(current(guest).ratings, undefined);
  assert.ok(!JSON.stringify(guest.room).includes("Still private"));
});

test("invalid and failed writes leave the last valid state intact; writes serialize", async (t) => {
  const { host, guest, service } = await fixture(t);
  const created = await create(host);
  await joinClub(guest, created);
  await assert.rejects(guest.updateMember({ constraints: { maxMinutes: -2 } }), (e) => e.status === 400);
  await assert.rejects(guest.updateMember({ constraints: { services: [{}] } }), (e) => e.status === 400);
  await assert.rejects(guest.updateMember({ name: "Anna" }), (e) => e.code === "name_taken");
  const before = (await host.refresh()).room.revision;
  const persist = service.store.persist.bind(service.store);
  service.store.persist = async () => { throw Error("disk unavailable"); };
  await assert.rejects(guest.updateMember({ name: "Lost" }), (e) => e.status === 500);
  service.store.persist = persist;
  assert.equal((await host.refresh()).room.revision, before);
  assert.equal(host.room.members.find((m) => m.id === guest.credential.memberId).name, "Bo");
  await Promise.all([host.updateMember({ name: "Annie" }), guest.updateMember({ name: "Bosse" })]);
  await host.refresh();
  assert.equal(host.room.revision, before + 2);
  assert.deepEqual(host.room.members.map((m) => m.name), ["Annie", "Bosse"]);
});

test("expired rooms are inaccessible and pruned; corrupt data fails closed and a lock prevents duplicate writers", async (t) => {
  let now = Date.parse("2026-10-13T00:00:00Z");
  const { host, service, dir } = await fixture(t, { now: () => now, retentionDays: 1 });
  await create(host);
  await assert.rejects(new RoomStore({ dataFile: join(dir, "rooms.json") }).init(), /already locked/);
  now += 2 * 24 * 60 * 60 * 1000;
  await assert.rejects(host.refresh(), (e) => e.status === 404);
  await service.store.prune();
  assert.deepEqual(JSON.parse(await readFile(join(dir, "rooms.json"), "utf8")).rooms, {});
  await service.close();
  await writeFile(join(dir, "rooms.json"), "{broken");
  await assert.rejects(new RoomStore({ dataFile: join(dir, "rooms.json") }).init(), /not reset/);
  assert.equal(await readFile(join(dir, "rooms.json"), "utf8"), "{broken");
  await assert.rejects(stat(join(dir, "rooms.json.lock")), { code: "ENOENT" });
});

test("the client calls fetch on its own, never as its method (browsers refuse that)", async () => {
  let self = null;
  const client = new ClubClient({
    fetchImpl: function () {
      self = this;
      return Promise.resolve(new Response(JSON.stringify({ service: "kuvert-club", version: 1, club: true }), { headers: { "Content-Type": "application/json" } }));
    },
  });
  await client.health();
  assert.equal(self, globalThis);
});

test("behind an HTTPS host, the page's own requests are same-origin; other sites are still refused", async (t) => {
  const { service } = await fixture(t);
  const host = new URL(service.url).host;
  // The browser says https://; this process, behind the host's proxy, hears plain http.
  assert.equal((await fetch(service.url + "/api/health", { headers: { Origin: "https://" + host } })).status, 200);
  assert.equal((await fetch(service.url + "/api/health", { headers: { Origin: "https://evil.example" } })).status, 403);
  assert.equal((await fetch(service.url + "/api/health", { headers: { Origin: "https://" + host + ".evil.example" } })).status, 403);
});

test("behind a trusted proxy, limits follow the address the proxy added, not one the visitor made up", async (t) => {
  const { service } = await fixture(t, { trustProxy: true });
  const create = (forwarded) => fetch(service.url + "/api/rooms", { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": forwarded }, body: "{}" });
  // Eight club creations an hour from one address, whatever the visitor puts in front of it.
  for (let i = 0; i < 8; i++) assert.notEqual((await create(`10.0.0.${i}, 203.0.113.7`)).status, 429);
  assert.equal((await create("10.0.0.99, 203.0.113.7")).status, 429);
  assert.notEqual((await create("203.0.113.8")).status, 429, "someone else is counted on their own");
});

test("a lock left by a crashed process or a restarted container doesn't stop the service starting", async () => {
  const dir = await mkdtemp(join(tmpdir(), "kuvert-lock-"));
  try {
    const dataFile = join(dir, "rooms.json");
    for (const pid of [2 ** 22 + 12345, process.pid]) {
      await writeFile(dataFile + ".lock", JSON.stringify({ pid, createdAt: "2026-10-13T00:00:00.000Z" }));
      const store = await new RoomStore({ dataFile }).init();
      assert.equal(JSON.parse(await readFile(dataFile + ".lock", "utf8")).pid, process.pid);
      // While this process holds it, a second writer is still refused.
      await assert.rejects(new RoomStore({ dataFile }).init(), /already locked/);
      await store.close();
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("storage the service can't write to is named as such, with what to do", { skip: process.getuid?.() === 0 && "root can write anywhere" }, async () => {
  const dir = await mkdtemp(join(tmpdir(), "kuvert-readonly-"));
  try {
    await chmod(dir, 0o500);
    await assert.rejects(new RoomStore({ dataFile: join(dir, "rooms.json") }).init(), /can't write to .*RAILWAY_RUN_UID=0/);
  } finally {
    await chmod(dir, 0o700);
    await rm(dir, { recursive: true, force: true });
  }
});

test("HTTP request, origin, filesystem and movie-proxy limits protect private service data", async (t) => {
  const seen = [];
  const { host, service, dir } = await fixture(t, {
    corsOrigins: ["https://kuvert.example"], tmdbToken: "eyJ" + "x".repeat(60),
    fetchImpl: async (url, options) => { seen.push({ url, options }); return new Response(JSON.stringify({ results: [{ id: 42, title: "Film" }] }), { headers: { "Content-Type": "application/json" } }); },
  });
  const allowed = await fetch(service.url + "/api/health", { headers: { Origin: "https://kuvert.example" } });
  assert.equal(allowed.headers.get("Access-Control-Allow-Origin"), "https://kuvert.example");
  assert.equal((await allowed.json()).metadata, true);
  assert.equal((await fetch(service.url + "/api/health", { headers: { Origin: "https://kuvert.example.evil" } })).status, 403);
  const preflight = await fetch(service.url + "/api/rooms", { method: "OPTIONS", headers: { Origin: "https://kuvert.example" } });
  assert.equal(preflight.status, 204);
  assert.ok(preflight.headers.get("Access-Control-Allow-Headers").includes("Authorization"));
  assert.equal((await fetch(service.url + "/api/rooms", { method: "POST", body: "{}" })).status, 415);
  assert.equal((await fetch(service.url + "/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" })).status, 400);
  assert.equal((await fetch(service.url + "/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: "x".repeat(800 * 1024) })).status, 413);
  assert.equal((await fetch(service.url + "/server/server.mjs")).status, 404);
  assert.equal((await fetch(service.url + "/server/.data/rooms.json")).status, 404);
  const externalRoot = join(dir, "public");
  await mkdir(join(externalRoot, "assets"), { recursive: true });
  await writeFile(join(externalRoot, "index.html"), "public page");
  await writeFile(join(dir, "private.json"), "PRIVATE");
  await symlink(join(dir, "private.json"), join(externalRoot, "assets", "escape.json"));
  const safeStatic = await serveClub({ root: externalRoot });
  t.after(() => safeStatic.close());
  assert.equal((await fetch(safeStatic.url + "/assets/escape.json")).status, 404);
  const result = await host.movie("/search/movie", { query: "A film", include_adult: true });
  assert.equal(result.results[0].id, 42);
  await host.movie("/search/movie", { query: "A film", include_adult: true });
  assert.equal(seen.length, 1, "safe metadata is cached server-side");
  assert.equal(seen[0].url.origin, "https://api.themoviedb.org");
  assert.equal(seen[0].url.searchParams.get("include_adult"), "false");
  assert.ok(seen[0].options.headers.Authorization.startsWith("Bearer eyJ"));
  assert.ok(!JSON.stringify(result).includes("eyJ"));
  assert.equal((await fetch(service.url + "/api/tmdb/search/movie?query=x&url=https://evil.example")).status, 400);
  assert.equal((await fetch(service.url + "/api/tmdb/search/movie?query=x&query=y")).status, 400);
  assert.equal((await fetch(service.url + "/api/tmdb/configuration")).status, 404);
});

test("public movie proxy stays unconfigured without a credential; upstream errors never expose it", async (t) => {
  const { host } = await fixture(t);
  await assert.rejects(host.movie("/search/movie", { query: "Film" }), (e) => e.code === "metadata_unconfigured");
  const { MetadataProxy } = await import("../../server/metadata.mjs");
  const proxy = new MetadataProxy({ token: "PRIVATE-KEY", fetchImpl: async () => { throw Error("PRIVATE-KEY upstream failure"); } });
  await assert.rejects(proxy.get("/search/movie", new URLSearchParams({ query: "film" })), (e) => e.code === "metadata_upstream" && !e.message.includes("PRIVATE-KEY"));
});

test("room creation is throttled without trusting forged forwarding headers", async (t) => {
  const { service } = await fixture(t);
  const request = (n) => fetch(service.url + "/api/rooms", { method: "POST", headers: { "Content-Type": "application/json", "X-Forwarded-For": "192.0.2." + n }, body: JSON.stringify({ name: "Club", memberName: "Host", catalogue: films }) });
  for (let n = 1; n <= 8; n++) assert.equal((await request(n)).status, 201);
  const ninth = await request(9);
  assert.equal(ninth.status, 429);
  assert.equal((await ninth.json()).error.code, "rate_limited");
  assert.equal(Object.keys(service.store.data.rooms).length, 8);
});

test("client shares only the guest invitation and requires explicit secure service origins", async (t) => {
  const { host } = await fixture(t);
  await create(host);
  const invitation = host.inviteURL("https://kuvert.example/index.html?old=value#old");
  const parsed = readClubInvite(invitation);
  assert.equal(parsed.inviteToken, host.credential.inviteToken);
  assert.equal(parsed.endpoint, host.endpoint);
  assert.equal(new URL(invitation).search, "");
  assert.ok(!invitation.includes(host.credential.memberToken));
  assert.equal(readClubInvite("https://kuvert.example/#club=bad"), null);
  assert.equal(clubEndpoint("https://club.example/"), "https://club.example");
  for (const invalid of ["http://remote.example", "https://secret:pass@club.example", "https://club.example/api", "javascript:alert(1)"]) assert.throws(() => clubEndpoint(invalid), ClubError);
  const guest = new ClubClient({ endpoint: host.endpoint });
  await guest.join({ inviteToken: host.credential.inviteToken, memberName: "Guest" });
  assert.throws(() => guest.inviteURL("https://kuvert.example/"), (e) => e.code === "host_only");
});

test("a late poll cannot resurrect a room after local membership is discarded", async () => {
  let release;
  const client = new ClubClient({
    credential: { roomId: "a".repeat(16), memberId: "b".repeat(16), memberToken: "c".repeat(43) },
    fetchImpl: () => new Promise((resolve) => { release = resolve; }),
  });
  const poll = client.refresh();
  client.credential = null;
  client.room = null;
  release(new Response(JSON.stringify({ room: { id: "a".repeat(16), name: "Old view" } })));
  await poll;
  assert.equal(client.room, null);
});
