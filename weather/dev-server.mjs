import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import waterLevelHandler from "../netlify/functions/water-level.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8080);
const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".geojson": "application/geo+json; charset=utf-8"
};

http.createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);

  if (pathname === "/api/water-level" || pathname === "/.netlify/functions/water-level") {
    const apiResponse = await waterLevelHandler(new Request(`http://localhost:${port}${request.url}`));
    response.writeHead(apiResponse.status, Object.fromEntries(apiResponse.headers));
    response.end(Buffer.from(await apiResponse.arrayBuffer()));
    return;
  }

  const requestedFile = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(root, requestedFile);

  if (!filePath.startsWith(root)) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(file);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, () => console.log(`Weather server: http://localhost:${port}`));
