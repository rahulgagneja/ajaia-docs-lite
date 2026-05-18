import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";
import { Store, sanitizeHtml } from "./lib/store.mjs";

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = join(process.cwd(), "public");
const store = new Store(process.env.DATA_FILE || "data/store.json");

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

export function createServer(activeStore = store) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      if (url.pathname.startsWith("/api/")) {
        await handleApi(req, res, url, activeStore);
        return;
      }
      await serveStatic(url.pathname, res);
    } catch (error) {
      sendJson(res, error.status || 500, { error: error.message || "Unexpected server error" });
    }
  });
}

async function handleApi(req, res, url, activeStore) {
  const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readJson(req) : {};
  const parts = url.pathname.split("/").filter(Boolean);
  const userId = url.searchParams.get("userId") || body.userId;

  if (req.method === "GET" && url.pathname === "/api/session") {
    sendJson(res, 200, { users: await activeStore.users(), currentUserId: userId || "ava" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/documents") {
    requireUser(userId);
    sendJson(res, 200, { documents: await activeStore.listDocuments(userId) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/documents") {
    sendJson(res, 201, { document: await activeStore.createDocument(body) });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/import") {
    requireUser(body.ownerId);
    const title = body.title || body.fileName || "Imported document";
    const escaped = escapeHtml(body.content || "").replace(/\n/g, "<br>");
    sendJson(res, 201, { document: await activeStore.createDocument({ ownerId: body.ownerId, title, content: `<p>${escaped}</p>` }) });
    return;
  }

  if (process.env.NODE_ENV === "test" && req.method === "POST" && url.pathname === "/api/reset") {
    sendJson(res, 200, { data: await activeStore.reset() });
    return;
  }

  if (parts[1] === "documents" && parts[2]) {
    const id = parts[2];
    if (req.method === "GET") {
      requireUser(userId);
      const doc = await activeStore.getDocument(id, userId);
      if (!doc) return sendJson(res, 404, { error: "Document not found or not shared with this user" });
      sendJson(res, 200, { document: doc });
      return;
    }
    if (req.method === "PUT") {
      requireUser(userId);
      const doc = await activeStore.updateDocument(id, userId, { title: body.title, content: sanitizeHtml(body.content) });
      if (!doc) return sendJson(res, 404, { error: "Document not found or not shared with this user" });
      sendJson(res, 200, { document: doc });
      return;
    }
    if (req.method === "POST" && parts[3] === "share") {
      requireUser(userId);
      const doc = await activeStore.shareDocument(id, userId, body.targetUserId);
      if (!doc) return sendJson(res, 403, { error: "Only the owner can share this document" });
      sendJson(res, 200, { document: doc });
      return;
    }
  }

  sendJson(res, 404, { error: "Route not found" });
}

async function serveStatic(pathname, res) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(PUBLIC_DIR, safePath);
  const content = await readFile(filePath);
  res.writeHead(200, { "content-type": types[extname(filePath)] || "application/octet-stream" });
  res.end(content);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) reject(Object.assign(new Error("Request body too large"), { status: 413 }));
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(Object.assign(new Error("Invalid JSON body"), { status: 400 }));
      }
    });
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function requireUser(userId) {
  if (!userId) throw Object.assign(new Error("A userId is required"), { status: 400 });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  createServer().listen(PORT, () => {
    console.log(`Ajaia Docs Lite running at http://localhost:${PORT}`);
  });
}
