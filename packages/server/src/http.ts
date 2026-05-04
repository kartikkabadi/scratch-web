import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { Readable } from "node:stream";
import { ScratchBridge } from "./service.js";
import { ScratchWebError, toScratchWebError } from "./errors.js";
import { parseSaveNoteRequest, parseSettings, readJsonBody, asRecord, readString, readOptionalString } from "./validation.js";
import { startFileWatcher } from "./watcher.js";

export interface HttpServerOptions {
  bridge: ScratchBridge;
  host: string;
  port: number;
  allowedOrigins?: readonly string[];
  webRoot?: string;
}

export function createScratchHttpServer(options: HttpServerOptions): Server {
  const rateLimiter = new InMemoryRateLimiter();
  const allowedOrigins = buildAllowedOrigins(options);
  const allowedHosts = buildAllowedHosts(allowedOrigins);
  const dynamicLocalPorts = options.port === 0 && (options.host === "127.0.0.1" || options.host === "localhost");
  return createServer(async (req, res) => {
    try {
      rateLimiter.assertAllowed(req.socket.remoteAddress ?? "unknown");
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      const response = await routeRequest(options, req.method ?? "GET", url, req.headers.origin, req, allowedOrigins, allowedHosts, dynamicLocalPorts);
      res.statusCode = response.status;
      for (const [key, value] of response.headers) {
        res.setHeader(key, value);
      }
      await writeNodeResponse(res, response);
    } catch (error: unknown) {
      const mapped = toScratchWebError(error);
      res.statusCode = mapped.status;
      applySecurityHeaders(res.setHeader.bind(res));
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: { code: mapped.code, message: mapped.message } }));
    }
  });
}

async function routeRequest(
  options: HttpServerOptions,
  method: string,
  url: URL,
  origin: string | undefined,
  request: AsyncIterable<Uint8Array> & { headers: { [key: string]: string | string[] | undefined } },
  allowedOrigins: readonly string[],
  allowedHosts: ReadonlySet<string>,
  dynamicLocalPorts: boolean
): Promise<Response> {
  const bridge = options.bridge;
  validateHost(request.headers.host, allowedHosts, dynamicLocalPorts);
  validateOrigin(origin, allowedOrigins, method, dynamicLocalPorts);
  validateMutationHeaders(method, request.headers["content-type"]);

  if (method === "GET" && url.pathname === "/health") {
    return json({ ok: true });
  }

  if (method === "GET" && url.pathname === "/api/notes-folder") {
    return json({ path: bridge.getNotesFolder() });
  }
  if (method === "PUT" && url.pathname === "/api/notes-folder") {
    throw new ScratchWebError("SETUP_ONLY", "Changing the notes folder is only allowed through local setup.", 403);
  }
  if (method === "GET" && url.pathname === "/api/notes") {
    return json(await bridge.listNotes());
  }
  if (method === "POST" && url.pathname === "/api/notes") {
    const body = asRecord(await readBodyFromNodeRequest(request));
    return json(await bridge.createNote(readOptionalString(body, "targetFolder")), 201);
  }
  const noteMatch = url.pathname.match(/^\/api\/notes\/(.+)$/u);
  if (noteMatch?.[1]) {
    const id = decodeURIComponent(noteMatch[1]);
    if (method === "GET") {
      return json(await bridge.readNote(id));
    }
    if (method === "PUT") {
      return json(await bridge.saveNote(parseSaveNoteRequest(await readBodyFromNodeRequest(request), id)));
    }
    if (method === "DELETE") {
      await bridge.deleteNote(id);
      return json({ ok: true });
    }
  }
  const duplicateMatch = url.pathname.match(/^\/api\/notes\/(.+)\/duplicate$/u);
  if (duplicateMatch?.[1] && method === "POST") {
    return json(await bridge.duplicateNote(decodeURIComponent(duplicateMatch[1])), 201);
  }
  const moveNoteMatch = url.pathname.match(/^\/api\/notes\/(.+)\/move$/u);
  if (moveNoteMatch?.[1] && method === "PATCH") {
    const body = asRecord(await readBodyFromNodeRequest(request));
    return json({ id: await bridge.moveNote(decodeURIComponent(moveNoteMatch[1]), readString(body, "targetFolder")) });
  }
  if (method === "GET" && url.pathname === "/api/folders") {
    return json(await bridge.listFolders());
  }
  if (method === "POST" && url.pathname === "/api/folders") {
    const body = asRecord(await readBodyFromNodeRequest(request));
    await bridge.createFolder(readString(body, "path"));
    return json({ ok: true }, 201);
  }
  const folderMatch = url.pathname.match(/^\/api\/folders\/(.+)$/u);
  if (folderMatch?.[1] && method === "DELETE") {
    await bridge.deleteFolder(decodeURIComponent(folderMatch[1]));
    return json({ ok: true });
  }
  const renameFolderMatch = url.pathname.match(/^\/api\/folders\/(.+)\/rename$/u);
  if (renameFolderMatch?.[1] && method === "PATCH") {
    const body = asRecord(await readBodyFromNodeRequest(request));
    await bridge.renameFolder(decodeURIComponent(renameFolderMatch[1]), readString(body, "newName"));
    return json({ ok: true });
  }
  const moveFolderMatch = url.pathname.match(/^\/api\/folders\/(.+)\/move$/u);
  if (moveFolderMatch?.[1] && method === "PATCH") {
    const body = asRecord(await readBodyFromNodeRequest(request));
    await bridge.moveFolder(decodeURIComponent(moveFolderMatch[1]), readString(body, "targetParent"));
    return json({ ok: true });
  }
  if (method === "GET" && url.pathname === "/api/settings") {
    return json(await bridge.getSettings());
  }
  if (method === "PUT" && url.pathname === "/api/settings") {
    await bridge.updateSettings(parseSettings(await readBodyFromNodeRequest(request)));
    return json({ ok: true });
  }
  if (method === "GET" && url.pathname === "/api/search") {
    return json(await bridge.searchNotes(url.searchParams.get("q") ?? ""));
  }
  if (method === "GET" && url.pathname === "/api/events") {
    return eventStream(bridge);
  }
  if (method === "GET" && url.pathname === "/api/git/available") {
    return json(await bridge.getGitAvailability());
  }
  if (method === "GET" && url.pathname === "/api/git/status") {
    return json(await bridge.getGitStatus());
  }
  if (method === "POST" && url.pathname === "/api/git/init") {
    return json(await bridge.initGit());
  }
  if (method === "POST" && url.pathname === "/api/git/commit") {
    const body = asRecord(await readBodyFromNodeRequest(request));
    return json(await bridge.commitGit(readString(body, "message")));
  }
  if (method === "POST" && url.pathname === "/api/git/push") {
    return json(await bridge.pushGit());
  }
  if (method === "POST" && url.pathname === "/api/git/fetch") {
    return json(await bridge.fetchGit());
  }
  if (method === "POST" && url.pathname === "/api/git/pull") {
    return json(await bridge.pullGit());
  }
  if (method === "POST" && url.pathname === "/api/git/sync") {
    return json(await bridge.syncGit());
  }
  if (method === "POST" && url.pathname === "/api/git/remote") {
    const body = asRecord(await readBodyFromNodeRequest(request));
    return json(await bridge.setGitRemote(readString(body, "url")));
  }
  if (method === "POST" && url.pathname === "/api/git/push-upstream") {
    return json(await bridge.pushGitUpstream());
  }
  const assetMatch = url.pathname.match(/^\/api\/assets\/(.+)$/u);
  if (assetMatch?.[1] && method === "GET") {
    const asset = await bridge.readAsset(decodeURIComponent(assetMatch[1]));
    const headers = new Headers({ "content-type": asset.metadata.mimeType, "cache-control": "no-store" });
    applySecurityHeaders((key, value) => headers.set(key, String(value)));
    return new Response(new Uint8Array(asset.bytes), { status: 200, headers });
  }
  if (method === "POST" && url.pathname === "/api/assets/import") {
    const body = asRecord(await readBodyFromNodeRequest(request, 14_000_000));
    return json(
      await bridge.importAsset({
        filename: readString(body, "filename"),
        mimeType: readString(body, "mimeType"),
        dataBase64: readString(body, "dataBase64")
      }),
      201
    );
  }
  if (url.pathname.startsWith("/api/")) {
    throw new ScratchWebError("NOT_FOUND", "Route not found.", 404);
  }

  if (method === "GET" || method === "HEAD") {
    return serveStaticApp(options.webRoot, url.pathname, method);
  }

  throw new ScratchWebError("NOT_FOUND", "Route not found.", 404);
}

function validateMutationHeaders(method: string, contentType: string | string[] | undefined): void {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return;
  }
  const value = Array.isArray(contentType) ? contentType.join(",") : contentType ?? "";
  if (!value.toLowerCase().includes("application/json")) {
    throw new ScratchWebError("UNSUPPORTED_MEDIA_TYPE", "Mutating requests must use application/json.", 415);
  }
}

async function readBodyFromNodeRequest(request: AsyncIterable<Uint8Array>, maxBytes?: number): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const body = new Request("http://localhost", { method: "POST", body: Buffer.concat(chunks) });
  return readJsonBody(body, maxBytes);
}

async function writeNodeResponse(res: { end: (chunk?: unknown) => void; write: (chunk: unknown) => boolean; once: (event: string, listener: () => void) => void }, response: Response): Promise<void> {
  if (!response.body) {
    res.end();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const stream = Readable.fromWeb(response.body as import("node:stream/web").ReadableStream);
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    res.once("close", () => {
      stream.destroy();
      finish();
    });
    stream.on("data", (chunk) => {
      if (!res.write(chunk)) {
        stream.pause();
        res.once("drain", () => stream.resume());
      }
    });
    stream.on("end", () => {
      res.end();
      finish();
    });
    stream.on("error", (error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
  });
}

function validateOrigin(origin: string | undefined, allowedOrigins: readonly string[], method: string, dynamicLocalPorts: boolean): void {
  const isMutation = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
  if (!origin) {
    if (isMutation) {
      throw new ScratchWebError("ORIGIN_REQUIRED", "Mutating browser requests must include an Origin header.", 403);
    }
    return;
  }
  let normalized: string;
  try {
    normalized = normalizeOrigin(origin);
  } catch {
    throw new ScratchWebError("INVALID_ORIGIN", "Origin is not allowed.", 403);
  }
  if (!allowedOrigins.includes(normalized) && !(dynamicLocalPorts && isLocalOrigin(normalized))) {
    throw new ScratchWebError("INVALID_ORIGIN", "Origin is not allowed.", 403);
  }
}

function validateHost(host: string | string[] | undefined, allowedHosts: ReadonlySet<string>, dynamicLocalPorts: boolean): void {
  const value = Array.isArray(host) ? host[0] : host;
  if (!value) {
    throw new ScratchWebError("HOST_REQUIRED", "Host is required.", 400);
  }
  if (!allowedHosts.has(value.toLowerCase()) && !(dynamicLocalPorts && isLocalHost(value))) {
    throw new ScratchWebError("INVALID_HOST", "Host is not allowed.", 403);
  }
}

function buildAllowedOrigins(options: HttpServerOptions): string[] {
  const origins = new Set<string>();
  const add = (origin: string) => {
    try {
      origins.add(normalizeOrigin(origin));
    } catch {
      throw new ScratchWebError("INVALID_ALLOWED_ORIGIN", "Configured allowed origin is invalid.", 500);
    }
  };

  add(`http://${options.host}:${options.port}`);
  if (options.host === "127.0.0.1") add(`http://localhost:${options.port}`);
  if (options.host === "localhost") add(`http://127.0.0.1:${options.port}`);
  for (const origin of options.allowedOrigins ?? []) {
    if (origin.trim()) add(origin);
  }
  return [...origins];
}

function buildAllowedHosts(allowedOrigins: readonly string[]): ReadonlySet<string> {
  return new Set(allowedOrigins.map((origin) => new URL(origin).host.toLowerCase()));
}

function normalizeOrigin(origin: string): string {
  const parsed = new URL(origin);
  return parsed.origin;
}

function isLocalOrigin(origin: string): boolean {
  const parsed = new URL(origin);
  return parsed.protocol === "http:" && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
}

function isLocalHost(host: string): boolean {
  try {
    const parsed = new URL(`http://${host}`);
    return parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  } catch {
    return false;
  }
}

async function serveStaticApp(webRoot: string | undefined, requestPath: string, method: string): Promise<Response> {
  if (!webRoot) {
    throw new ScratchWebError("NOT_FOUND", "Route not found.", 404);
  }

  const pathname = decodeURIComponent(requestPath);
  if (pathname.includes("\\")) {
    throw new ScratchWebError("INVALID_PATH", "Invalid static asset path.", 400);
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/u, "");
  const candidate = path.resolve(webRoot, relativePath);
  const root = path.resolve(webRoot);
  const resolved = (await safeStat(candidate))?.isFile() ? candidate : path.join(root, "index.html");
  const relative = path.relative(root, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new ScratchWebError("PATH_ESCAPE", "Static asset path escapes web root.", 400);
  }

  const headers = new Headers({ "content-type": contentTypeForPath(resolved) });
  applySecurityHeaders((key, value) => headers.set(key, String(value)));
  if (method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }
  return new Response(await readFile(resolved), { status: 200, headers });
}

async function safeStat(filePath: string) {
  try {
    return await stat(filePath);
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code === "ENOENT" || code === "ENOTDIR") {
      return null;
    }
    throw error;
  }
}

function contentTypeForPath(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".webmanifest") return "application/manifest+json; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".png") return "image/png";
  if (extension === ".ico") return "image/x-icon";
  if (extension === ".woff2") return "font/woff2";
  return "application/octet-stream";
}

function json(value: unknown, status = 200): Response {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  applySecurityHeaders((key, headerValue) => headers.set(key, String(headerValue)));
  return new Response(JSON.stringify(value), { status, headers });
}

function eventStream(bridge: ScratchBridge): Response {
  const root = bridge.getNotesFolder();
  if (!root) {
    throw new ScratchWebError("NOTES_FOLDER_NOT_SET", "Notes folder is not configured.", 500);
  }
  const encoder = new TextEncoder();
  let watcher: { close: () => void } | null = null;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: ready\ndata: ${JSON.stringify({ type: "service.status.changed", timestamp: new Date().toISOString() })}\n\n`));
      const settings = await bridge.getSettings();
      watcher = startFileWatcher(root, (event) => {
        const type = event.kind === "deleted" ? "note.deleted" : event.kind === "created" ? "note.created" : "note.changed";
        try {
          controller.enqueue(
            encoder.encode(
              `event: ${type}\ndata: ${JSON.stringify({
                type,
                changedIds: event.changedIds,
                path: event.path,
                timestamp: new Date().toISOString()
              })}\n\n`
            )
          );
        } catch {
          watcher?.close();
          watcher = null;
        }
      }, settings.ignoredPatterns);
    },
    cancel() {
      watcher?.close();
      watcher = null;
    }
  });
  const headers = new Headers({
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-store",
    connection: "keep-alive"
  });
  applySecurityHeaders((key, value) => headers.set(key, String(value)));
  return new Response(stream, { status: 200, headers });
}

function applySecurityHeaders(setHeader: (key: string, value: string) => void): void {
  setHeader("content-security-policy", "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'");
  setHeader("x-frame-options", "DENY");
  setHeader("x-content-type-options", "nosniff");
  setHeader("referrer-policy", "strict-origin-when-cross-origin");
  setHeader("permissions-policy", "camera=(), microphone=(), geolocation=()");
}

class InMemoryRateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  assertAllowed(key: string): void {
    const now = Date.now();
    const existing = this.hits.get(key);
    if (!existing || existing.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + 60_000 });
      return;
    }
    existing.count += 1;
    if (existing.count > 600) {
      throw new ScratchWebError("RATE_LIMITED", "Too many requests.", 429);
    }
  }
}
