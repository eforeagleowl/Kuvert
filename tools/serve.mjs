// A small static server for the repo, for tests and local previews: node tools/serve.mjs [port]
// Serves the site like GitHub Pages does, 404 page included. The tests can also put retired Kuvert
// Classic (tests/classic/) back at /classic/, to check that Kuvert still reads what it wrote.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
/** Kuvert Classic at its old address, for the tests: serve(0, { mounts: CLASSIC }). */
export const CLASSIC = { "/classic/": join(ROOT, "tests", "classic") };
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
};

/**
 * `root` defaults to this repo; `setRoot` swaps it while running (a deploy, for upgrade tests).
 * `mounts` serves other folders at addresses of their own: { "/classic/": "/path/to/folder" }.
 */
export function serve(port = 0, { root = ROOT, mounts = {} } = {}) {
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (path.endsWith("/")) path += "index.html";
      const mount = Object.keys(mounts).find((m) => path.startsWith(m));
      const base = mount ? mounts[mount] : root;
      const file = normalize(join(base, mount ? path.slice(mount.length) : path));
      if (!file.startsWith(base.endsWith(sep) ? base : base + sep)) throw Object.assign(Error(), { code: "ENOENT" });
      if ((await stat(file)).isDirectory()) {
        res.writeHead(301, { Location: path + "/" });
        return res.end();
      }
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(await readFile(file));
    } catch (e) {
      // Like GitHub Pages: an address that doesn't exist gets the site's own 404 page.
      const page = e.code === "ENOENT" ? await readFile(join(root, "404.html")).catch(() => null) : null;
      res.writeHead(e.code === "ENOENT" ? 404 : 500, { "Content-Type": page ? TYPES[".html"] : "text/plain" });
      res.end(page || (e.code === "ENOENT" ? "Not found" : "Error"));
    }
  });
  return new Promise((resolve) =>
    server.listen(port, "127.0.0.1", () => resolve({ server, url: "http://127.0.0.1:" + server.address().port, setRoot: (dir) => (root = dir) })),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url } = await serve(Number(process.argv[2]) || 8123);
  console.log("Serving Kuvert at " + url + "/");
}
