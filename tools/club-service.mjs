// Points the site at its film club server, or back off:
//   node tools/club-service.mjs https://kuvert.up.railway.app
//   node tools/club-service.mjs off
// Writes the address to js/club/service.js, allows it (and only it) in index.html's connect-src, and restamps
// the service worker. The server needs the site in its KUVERT_CORS_ORIGINS too (docs/HOSTING.md).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { clubEndpoint } from "../js/club/client.js";
import { stamp } from "./stamp.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SERVICE = join(ROOT, "js", "club", "service.js");
const PAGE = join(ROOT, "index.html");
const SETTING = /export const CLUB_SERVICE = "([^"]*)";/;

/** The service setting and the page, pointed at `address` ("" or "off" for none). */
export function pointAt(address, { service, html }) {
  const next = address === "off" ? "" : clubEndpoint(address);
  const previous = service.match(SETTING)?.[1];
  if (previous === undefined) throw new Error("js/club/service.js has no CLUB_SERVICE setting.");
  const policy = html.match(/connect-src ([^;"]*)/);
  if (!policy) throw new Error("index.html's security policy has no connect-src.");
  const sources = policy[1].split(/\s+/).filter((s) => s && s !== previous);
  if (next) sources.splice(1, 0, next);
  return {
    service: service.replace(SETTING, `export const CLUB_SERVICE = "${next}";`),
    html: html.replace(policy[0], "connect-src " + sources.join(" ")),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const address = process.argv[2];
  if (address === undefined) {
    console.error("Usage: node tools/club-service.mjs https://your-club-service.example | off");
    process.exit(1);
  }
  if (address !== "off" && !address.startsWith("https://")) {
    console.error("The site's club service needs its https:// address.");
    process.exit(1);
  }
  const next = pointAt(address, { service: readFileSync(SERVICE, "utf8"), html: readFileSync(PAGE, "utf8") });
  writeFileSync(SERVICE, next.service);
  writeFileSync(PAGE, next.html);
  const sw = stamp();
  if (sw.src !== sw.next) writeFileSync(join(ROOT, "sw.js"), sw.next);
  const now = next.service.match(SETTING)[1];
  console.log(now ? `The site now uses the film club at ${now}. Commit index.html, js/club/service.js and sw.js.` : "The site no longer points at a film club server.");
}
