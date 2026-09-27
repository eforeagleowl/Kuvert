// A small static server for the repo, for tests and local previews: node tools/serve.mjs [port]
// Serves / (the original app) and /next/ (the rebuild) from the same origin, like GitHub Pages does.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
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

export function serve(port = 0) {
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (path.endsWith("/")) path += "index.html";
      const file = normalize(join(ROOT, path));
      if (!file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) throw Object.assign(Error(), { code: "ENOENT" });
      if ((await stat(file)).isDirectory()) {
        res.writeHead(301, { Location: path + "/" });
        return res.end();
      }
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(await readFile(file));
    } catch (e) {
      res.writeHead(e.code === "ENOENT" ? 404 : 500, { "Content-Type": "text/plain" });
      res.end(e.code === "ENOENT" ? "Not found" : "Error");
    }
  });
  return new Promise((resolve) =>
    server.listen(port, "127.0.0.1", () => resolve({ server, url: "http://127.0.0.1:" + server.address().port })),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { url } = await serve(Number(process.argv[2]) || 8123);
  console.log("Serving the repo at " + url + "/ (original) and " + url + "/next/ (rebuild)");
}
