// Writes next/sw.js's file list and version from the files themselves, so every change to the app
// ships as a new service worker. `node tools/stamp.mjs --check` fails instead when the stamp is
// stale (CI runs that).
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const NEXT = join(ROOT, "next");
const SW = join(NEXT, "sw.js");
// Shared with the classic app, one level up (the icons and favicon).
const SHARED = ["../favicon.svg", "../icon-180.png", "../icon-192.png", "../icon-512.png", "../icon-maskable-512.png"];
const SKIP = new Set(["sw.js", "FEATURES.md", "README.md", "OFL.txt"]);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : SKIP.has(e.name) ? [] : [join(dir, e.name)]));
}

export function stamp() {
  const own = walk(NEXT).map((f) => "./" + relative(NEXT, f).split(sep).join("/"));
  // The page is fetched at ./ (and cached there by the worker too).
  const files = ["./", ...own.filter((f) => f !== "./index.html"), ...SHARED];
  const hash = createHash("sha256");
  for (const f of [...own, ...SHARED]) {
    hash.update(f + "\0");
    hash.update(readFileSync(join(NEXT, f)));
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
  if (next === src && !src.includes("// <stamp>")) throw new Error("next/sw.js has no <stamp> block");
  return { version, files, src, next };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { version, files, src, next } = stamp();
  if (process.argv.includes("--check")) {
    if (src !== next) {
      console.error("next/sw.js is out of date: run `npm run stamp` and commit the result.");
      process.exit(1);
    }
    console.log(`next/sw.js is current (${version}, ${files.length} files).`);
  } else {
    if (src !== next) writeFileSync(SW, next);
    console.log(`next/sw.js: version ${version}, ${files.length} files${src === next ? " (unchanged)" : ""}.`);
  }
}
