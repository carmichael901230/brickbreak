import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const host = "127.0.0.1";
const port = Number(process.env.PORT) || 4173;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function resolveRequestPath(urlPath) {
  const normalized = urlPath === "/" ? "/index.html" : urlPath;
  const decoded = decodeURIComponent(normalized);
  const safePath = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  return path.join(__dirname, safePath);
}

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    const filePath = resolveRequestPath(requestUrl.pathname);

    if (!filePath.startsWith(__dirname)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const body = await readFile(filePath);

    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(body);
  } catch (error) {
    const statusCode = error.code === "ENOENT" ? 404 : 500;
    response.writeHead(statusCode, {
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end(statusCode === 404 ? "Not found" : "Server error");
  }
});

server.listen(port, host, () => {
  console.log(`Arc Cascade running at http://${host}:${port}`);
});
