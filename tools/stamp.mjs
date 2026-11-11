// Writes sw.js's file list and version from the files themselves, so every change to the app ships
// as a new service worker. Before that, writes the page's preload list: every module the app starts
// with, so a first visit fetches them together instead of finding them one import at a time.
// `node tools/stamp.mjs --check` fails instead when either stamp is stale (CI runs that).
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, posix, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SW = join(ROOT, "sw.js");
const PAGE = join(ROOT, "index.html");
const ENTRY = "js/main.js";
// The app: the page, its manifest and these folders. Everything else in the repo (the forwarding pages
// in classic/ and next/, the 404 page, tools, tests, docs) stays out.
const PAGES = ["index.html", "manifest.webmanifest"];
const DIRS = ["css", "js", "assets"];
const ICONS = ["favicon.svg", "icon-180.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"];
const SKIP = new Set(["OFL.txt"]);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : SKIP.has(e.name) ? [] : [join(dir, e.name)]));
}

/** Every module the entry script imports, directly or not, in the order they are met. */
export function startModules(entry = ENTRY) {
  const met = new Set();
  (function walk(file) {
    if (met.has(file)) return;
    met.add(file);
    const src = readFileSync(join(ROOT, file), "utf8");
    // Static imports and re-exports only: `import("./x.js")` in a comment or a function is no start-up cost.
    for (const m of src.matchAll(/^\s*(?:import|export)\s(?:[^"';]*?\sfrom\s*)?["'](\.[^"']+)["']/gm)) walk(posix.normalize(posix.join(dirname(file).split(sep).join("/"), m[1])));
  })(entry);
  met.delete(entry); // the page's own <script> asks for it
  return [...met];
}

/** index.html with its preload list brought up to date. */
export function preloads() {
  const src = readFileSync(PAGE, "utf8");
  const block = "<!-- <preload> written by tools/stamp.mjs (npm run stamp); do not edit by hand. -->\n" + startModules().map((f) => `<link rel="modulepreload" href="${f}">\n`).join("") + "<!-- </preload> -->";
  if (!src.includes("<!-- <preload>")) throw new Error("index.html has no <preload> block");
  return { src, next: src.replace(/<!-- <preload>[\s\S]*?<!-- <\/preload> -->/, block) };
}

/** `page` is index.html's text when it isn't on disk yet (a check, or just before it is written). */
export function stamp(page = null) {
  const read = (f) => (page !== null && f === "./index.html" ? Buffer.from(page) : readFileSync(join(ROOT, f)));
  const own = [...PAGES, ...DIRS.flatMap((d) => walk(join(ROOT, d)).map((f) => relative(ROOT, f).split(sep).join("/"))), ...ICONS].map((f) => "./" + f);
  // The page is fetched at ./ (and cached there by the worker too).
  const files = ["./", ...own.filter((f) => f !== "./index.html")];
  const hash = createHash("sha256");
  for (const f of own) {
    hash.update(f + "\0");
    hash.update(read(f));
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
  const page = preloads();
  const { version, files, src, next } = stamp(page.next);
  if (process.argv.includes("--check")) {
    if (page.src !== page.next) {
      console.error("index.html's preload list is out of date: run `npm run stamp` and commit the result.");
      process.exit(1);
    }
    if (src !== next) {
      console.error("sw.js is out of date: run `npm run stamp` and commit the result.");
      process.exit(1);
    }
    console.log(`sw.js is current (${version}, ${files.length} files).`);
  } else {
    if (page.src !== page.next) writeFileSync(PAGE, page.next);
    if (src !== next) writeFileSync(SW, next);
    console.log(`sw.js: version ${version}, ${files.length} files${src === next ? " (unchanged)" : ""}; ${startModules().length} modules preloaded.`);
  }
}
