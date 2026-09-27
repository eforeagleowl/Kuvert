// Writes sw.js's file list and version from the files themselves, so every change to the app ships
// as a new service worker. `node tools/stamp.mjs --check` fails instead when the stamp is stale
// (CI runs that).
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SW = join(ROOT, "sw.js");
// The app: the page, its manifest and these folders. Everything else in the repo (Kuvert Classic in
// classic/, tools, tests, docs) stays out.
const PAGES = ["index.html", "manifest.webmanifest"];
const DIRS = ["css", "js", "assets"];
const ICONS = ["favicon.svg", "icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];
const SKIP = new Set(["OFL.txt"]);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : SKIP.has(e.name) ? [] : [join(dir, e.name)]));
}

export function stamp() {
  const own = [...PAGES, ...DIRS.flatMap((d) => walk(join(ROOT, d)).map((f) => relative(ROOT, f).split(sep).join("/"))), ...ICONS].map((f) => "./" + f);
  // The page is fetched at ./ (and cached there by the worker too).
  const files = ["./", ...own.filter((f) => f !== "./index.html")];
  const hash = createHash("sha256");
  for (const f of own) {
    hash.update(f + "\0");
    hash.update(readFileSync(join(ROOT, f)));
  }
  const version = hash.digest("hex").slice(0, 12);
  const block =
    "// <stamp> written by tools/stamp.mjs (npm run stamp); do not edit by hand.\n" +
    `const VERSION = "${version}";\n` +
    "const FILES = [\n" +
    files.map((f) => `  "${f}",\n`).join("") +
    "];\n// </stamp>";
  const src = readFileSync(SW, "utf8");
  const next = src.replace(/\/\/ <stamp>[\s\S]*?\/\/ <\/stamp>/, block);
  if (next === src && !src.includes("// <stamp>")) throw new Error("sw.js has no <stamp> block");
  return { version, files, src, next };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { version, files, src, next } = stamp();
  if (process.argv.includes("--check")) {
    if (src !== next) {
      console.error("sw.js is out of date: run `npm run stamp` and commit the result.");
      process.exit(1);
    }
    console.log(`sw.js is current (${version}, ${files.length} files).`);
  } else {
    if (src !== next) writeFileSync(SW, next);
    console.log(`sw.js: version ${version}, ${files.length} files${src === next ? " (unchanged)" : ""}.`);
  }
}
