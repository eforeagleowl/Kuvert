// Optional backend; the original static app continues to run without this process.
import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { RoomStore } from "./rooms.mjs";
import { MetadataProxy } from "./metadata.mjs";
import { ApiError, fail, object } from "./validation.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BODY_LIMIT = 768 * 1024;
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2", ".md": "text/plain; charset=utf-8", ".txt": "text/plain; charset=utf-8" };
const ROOT_FILES = new Set(["index.html", "404.html", "favicon.svg", "manifest.webmanifest", "manifest.json", "sw.js", "LICENSE", "apple-touch-icon.png", "icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "og-image.png"]);
// The same files GitHub Pages publishes (_config.yml): the app, not its notes, tests or tools.
const DIRECTORIES = new Set(["assets", "css", "js", "classic", "next"]);
const SECURITY = {
  "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()", "X-Frame-Options": "DENY",
};

export class RequestLimits {
  constructor({ now = Date.now } = {}) { this.now = now; this.entries = new Map(); }
  use(ip, kind, count, window) {
    const key = ip + ":" + kind, now = this.now();
    if (this.entries.size > 10000) {
      for (const [k, v] of this.entries) if (v.until <= now) this.entries.delete(k);
      if (this.entries.size > 10000) fail(503, "capacity", "The club service is busy. Please try again later.");
    }
    const current = this.entries.get(key);
    const entry = current && current.until > now ? current : { until: now + window, used: 0 };
    if (++entry.used > count) fail(429, "rate_limited", "Too many requests. Wait a moment, then try again.");
    this.entries.set(key, entry);
  }
}

function body(req) {
  if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] || "")) fail(415, "content_type", "Send club requests as JSON.");
  if (Number(req.headers["content-length"]) > BODY_LIMIT) { req.resume(); fail(413, "too_large", "This club request is too large."); }
  return new Promise((resolveBody, reject) => {
    let size = 0, failed = false;
    const chunks = [];
    req.on("data", (chunk) => {
      if (failed) return;
      size += chunk.length;
      if (size > BODY_LIMIT) { failed = true; chunks.length = 0; reject(new ApiError(413, "too_large", "This club request is too large.")); }
      else chunks.push(chunk);
    });
    req.on("error", () => { if (!failed) reject(new ApiError(400, "request_failed", "The club request was interrupted.")); });
    req.on("end", () => {
      if (failed) return;
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!object(value)) fail(400, "invalid_input", "Send a JSON object.");
        resolveBody(value);
      } catch (error) { reject(error instanceof ApiError ? error : new ApiError(400, "invalid_json", "This club request is not valid JSON.")); }
    });
  });
}
function credential(req) {
  const value = req.headers.authorization || "";
  if (!/^Bearer [A-Za-z0-9_-]{43}$/.test(value)) fail(401, "unauthorized", "Reconnect using your private club membership.");
  return value.slice(7);
}
function origin(value) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== value) throw Error("CORS origins must be exact HTTP(S) origins, without paths or trailing slashes.");
  return url.origin;
}
function json(res, status, value, headers = {}) {
  res.writeHead(status, { ...SECURITY, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store, private", ...headers });
  res.end(JSON.stringify(value));
}

async function staticFile(req, res, url, root) {
  if (!["GET", "HEAD"].includes(req.method)) fail(405, "method", "This address does not accept that method.");
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { fail(400, "invalid_path", "This address is invalid."); }
  if (path.includes("\0") || path.includes("\\")) fail(404, "file_missing", "Not found.");
  const segments = path.split("/").filter(Boolean);
  if (segments.some((s) => s.startsWith(".")) || (segments.length === 1 && !ROOT_FILES.has(segments[0])) || (segments.length > 1 && !DIRECTORIES.has(segments[0]))) fail(404, "file_missing", "Not found.");
  if (path.endsWith("/")) path += "index.html";
  const base = await realpath(root);
  const candidate = resolve(base, "." + path);
  if (!candidate.startsWith(base + sep)) fail(404, "file_missing", "Not found.");
  const file = await realpath(candidate).catch(() => null);
  if (!file || !file.startsWith(base + sep)) fail(404, "file_missing", "Not found.");
  if (!(await stat(file)).isFile()) fail(404, "file_missing", "Not found.");
  if (!TYPES[extname(file)] && !ROOT_FILES.has(segments[0])) fail(404, "file_missing", "Not found.");
  const data = await readFile(file);
  res.writeHead(200, { ...SECURITY, "Content-Type": TYPES[extname(file)] || "text/plain; charset=utf-8", "Cache-Control": "no-cache" });
  res.end(req.method === "HEAD" ? undefined : data);
}

/** Start with port 0 for tests. Put dataFile on persistent storage before public deployment. */
export async function serveClub({ port = 0, host = "127.0.0.1", root = ROOT, dataFile, retentionDays = 180, corsOrigins = [], tmdbToken = "", fetchImpl = fetch, now = Date.now, trustProxy = false, maxRooms = 5000 } = {}) {
  const cors = new Set(corsOrigins.map(origin));
  const store = await new RoomStore({ dataFile, retentionDays, now, maxRooms }).init();
  const metadata = new MetadataProxy({ token: tmdbToken, fetchImpl, now });
  const limits = new RequestLimits({ now });
  const server = createServer(async (req, res) => {
    let corsHeaders = {};
    try {
      const url = new URL(req.url, "http://kuvert.local");
      if (url.pathname.length > 1000 || url.search.length > 1500) fail(414, "too_large", "This request address is too long.");
      if (!url.pathname.startsWith("/api/")) return await staticFile(req, res, url, root);
      const incomingOrigin = req.headers.origin;
      if (incomingOrigin) {
        // Same-origin requests need no CORS grant. Compare the origin's host with the request's: behind an
        // HTTPS proxy the page is https:// while this process hears plain http, so the scheme can't match.
        let sameHost = false;
        try { sameHost = new URL(incomingOrigin).host === req.headers.host; } catch {}
        if (!sameHost && !cors.has(incomingOrigin)) fail(403, "origin_denied", "This website is not allowed to connect to the club service.");
        if (cors.has(incomingOrigin)) corsHeaders = { "Access-Control-Allow-Origin": incomingOrigin, "Vary": "Origin", "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Max-Age": "600" };
      }
      if (req.method === "OPTIONS") { res.writeHead(204, { ...SECURITY, ...corsHeaders }); return res.end(); }
      const address = trustProxy ? String(req.headers["x-forwarded-for"] || req.socket.remoteAddress).split(",")[0].trim().slice(0, 100) : req.socket.remoteAddress;
      // Twelve friends sharing a home connection each poll twelve times a minute.
      limits.use(address, "api", 300, 60 * 1000);
      if (req.method === "GET" && url.pathname === "/api/health") return json(res, 200, { service: "kuvert-club", version: 1, club: true, metadata: metadata.connected, retentionDays }, corsHeaders);
      if (req.method === "GET" && url.pathname.startsWith("/api/tmdb/")) {
        limits.use(address, "metadata", 40, 60 * 1000);
        return json(res, 200, await metadata.get(url.pathname.slice("/api/tmdb".length), url.searchParams), corsHeaders);
      }
      if (req.method === "POST" && url.pathname === "/api/rooms") {
        limits.use(address, "create", 8, 60 * 60 * 1000);
        return json(res, 201, await store.create(await body(req)), corsHeaders);
      }
      if (req.method === "POST" && url.pathname === "/api/rooms/join") {
        limits.use(address, "join", 30, 60 * 60 * 1000);
        return json(res, 200, await store.join(await body(req)), corsHeaders);
      }
      const route = /^\/api\/rooms\/([A-Za-z0-9_-]{16})(?:\/(.*))?$/.exec(url.pathname);
      if (!route) fail(404, "endpoint_missing", "This club endpoint could not be found.");
      const roomId = route[1], action = route[2] || "", secret = credential(req);
      let result;
      if (req.method === "GET" && action === "") result = store.get(roomId, secret);
      else if (req.method === "GET" && action === "scrapbook") {
        const current = store.get(roomId, secret);
        result = { name: current.room.name, roomId, sessions: current.room.sessions.filter((s) => s.state === "revealed") };
      }
      else if (req.method === "DELETE" && action === "") result = await store.closeRoom(roomId, secret);
      else if (req.method === "PUT" && action === "members/self") result = await store.updateMember(roomId, secret, await body(req));
      else if (req.method === "POST" && action === "members/self/reconnect") result = await store.reconnect(roomId, secret);
      else if (req.method === "POST" && action === "members/self/leave") result = await store.leave(roomId, secret);
      else if (req.method === "PUT" && action === "catalogue") result = await store.setCatalogue(roomId, secret, (await body(req)).catalogue);
      else if (req.method === "POST" && action === "sessions") result = await store.propose(roomId, secret, await body(req));
      else {
        const sessionRoute = /^sessions\/([A-Za-z0-9_-]{16})\/(agree|rate|cancel)$/.exec(action);
        if (req.method !== "POST" || !sessionRoute) fail(404, "endpoint_missing", "This club endpoint could not be found.");
        const [, sessionId, command] = sessionRoute;
        result = command === "agree" ? await store.agree(roomId, secret, sessionId, await body(req))
          : command === "rate" ? await store.rate(roomId, secret, sessionId, await body(req))
            : await store.cancel(roomId, secret, sessionId);
      }
      json(res, 200, result, corsHeaders);
    } catch (error) {
      const api = error instanceof ApiError;
      if (!res.headersSent) json(res, api ? error.status : 500, { error: { code: api ? error.code : "service_error", message: api ? error.message : "The club request could not be saved. Please try again." } }, corsHeaders);
      else res.end();
    }
  });
  server.requestTimeout = 20000;
  server.headersTimeout = 10000;
  server.keepAliveTimeout = 5000;
  try {
    await new Promise((resolveListen, reject) => { server.once("error", reject); server.listen(port, host, resolveListen); });
  } catch (error) { await store.close(); throw error; }
  const timer = setInterval(() => { store.prune().catch(() => console.error("Club retention cleanup failed; check persistent storage.")); }, 60 * 60 * 1000);
  timer.unref();
  let closePromise;
  return {
    server, store, metadata,
    url: "http://" + (host.includes(":") ? `[${host}]` : host) + ":" + server.address().port,
    close() {
      if (!closePromise) closePromise = (async () => {
        clearInterval(timer);
        await new Promise((resolveClose) => { server.close(resolveClose); server.closeIdleConnections(); });
        await store.close();
      })();
      return closePromise;
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const service = await serveClub({
    port: Number(process.env.PORT || process.env.KUVERT_PORT || 8123),
    host: process.env.KUVERT_HOST || "127.0.0.1",
    dataFile: resolve(process.env.KUVERT_DATA_FILE || join(ROOT, "server", ".data", "rooms.json")),
    retentionDays: Number(process.env.KUVERT_RETENTION_DAYS || 180),
    corsOrigins: (process.env.KUVERT_CORS_ORIGINS || "").split(",").filter(Boolean),
    tmdbToken: process.env.TMDB_TOKEN || "",
    trustProxy: process.env.KUVERT_TRUST_PROXY === "1",
  });
  console.log("Kuvert and its optional film-club service are ready at " + service.url + "/");
  let stopping = false;
  const stop = async () => { if (stopping) return; stopping = true; await service.close(); process.exit(0); };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}
