#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { access, mkdir, mkdtemp, readFile, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.join(rootDir, "packages", "web", "dist");
const serverEntry = path.join(rootDir, "packages", "server", "dist", "index.js");

const results = [];
let server;
let baseUrl;
let bridge;
let qaRoot;
let notesRoot;
let createdNote;
let savedNote;
let movedNoteId;

function record(ok, name, detail = "") {
  results.push({ ok, name, detail });
  const suffix = detail ? ` - ${detail}` : "";
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${suffix}`);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    record(true, name, detail);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    record(false, name, message);
  }
}

async function api(route, options = {}) {
  const method = options.method ?? "GET";
  const expected = options.expected ?? 200;
  const headers = { ...(options.headers ?? {}) };
  if (options.body !== undefined && options.contentType !== null) {
    headers["content-type"] = options.contentType ?? "application/json";
  }
  if (options.origin !== undefined) {
    if (options.origin !== null) {
      headers.origin = options.origin;
    }
  } else if (method !== "GET" && method !== "HEAD") {
    headers.origin = baseUrl;
  }

  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal
  });
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Keep raw text for static routes.
  }
  if (response.status !== expected) {
    throw new Error(`expected ${expected}, got ${response.status}: ${text.slice(0, 300)}`);
  }
  return { response, body, text };
}

async function startServer() {
  const { createScratchHttpServer, ScratchBridge } = await import(pathToFileURL(serverEntry).href);
  qaRoot = await mkdtemp(path.join(tmpdir(), "scratch-web-realworld-qa-"));
  notesRoot = path.join(qaRoot, "notes");
  const backupsRoot = path.join(qaRoot, "backups");

  await mkdir(path.join(notesRoot, "Projects"), { recursive: true });
  await mkdir(path.join(notesRoot, "Ignored"), { recursive: true });
  await mkdir(path.join(notesRoot, ".scratch"), { recursive: true });
  await writeFile(
    path.join(notesRoot, "Journal.md"),
    [
      "---",
      "scratch: fixture",
      "---",
      "# Launch QA",
      "",
      "This note has searchable rainbow-spark text.",
      "",
      "- [ ] unchecked task",
      "- [x] checked task",
      "",
      "```js",
      "console.log('qa');",
      "```",
      "",
      "| Feature | Status |",
      "| --- | --- |",
      "| Tables | present |",
      "",
      "$$a^2 + b^2 = c^2$$",
      "",
      "```mermaid",
      "flowchart LR",
      "  A[Open] --> B[Save]",
      "```",
      ""
    ].join("\n"),
    "utf8"
  );
  await writeFile(path.join(notesRoot, "Projects", "Nested.md"), "# Nested Fixture\n\nInside a folder.\n", "utf8");
  await writeFile(path.join(notesRoot, "Ignored", "Hidden.md"), "# Hidden\n\nShould be ignored after settings update.\n", "utf8");
  await writeFile(
    path.join(notesRoot, ".scratch", "settings.json"),
    JSON.stringify(
      {
        theme: { mode: "system" },
        unknownFutureSetting: "preserve-me",
        defaultNoteName: "QA {date} {time}"
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(path.join(qaRoot, "outside.md"), "# Outside\n\nThis file must not be readable through note APIs.\n", "utf8");
  await symlink(path.join(qaRoot, "outside.md"), path.join(notesRoot, "Linked.md"));

  bridge = new ScratchBridge({ notesRoot, backupsRoot });
  await bridge.initialize();
  server = createScratchHttpServer({ bridge, host: "127.0.0.1", port: 0, webRoot });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function runChromeScreenshot(label, windowSize) {
  const chrome = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  await access(chrome, fsConstants.X_OK);
  const screenshot = path.join(qaRoot, `${label}.png`);
  const userDataDir = path.join(qaRoot, `chrome-${label}`);
  await execFileAsync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-background-networking",
      "--disable-extensions",
      "--disable-sync",
      "--no-first-run",
      "--hide-scrollbars",
      `--user-data-dir=${userDataDir}`,
      `--window-size=${windowSize}`,
      "--virtual-time-budget=9000",
      `--screenshot=${screenshot}`,
      `${baseUrl}/?qa=${encodeURIComponent(label)}`
    ],
    { timeout: 45_000, maxBuffer: 2 * 1024 * 1024 }
  );
  const metadata = await stat(screenshot);
  assert.ok(metadata.size > 10_000, `screenshot too small: ${metadata.size} bytes`);
  return `${path.relative(rootDir, screenshot)} (${metadata.size} bytes)`;
}

async function main() {
  await check("built server bundle exists", async () => {
    await access(serverEntry, fsConstants.R_OK);
    return path.relative(rootDir, serverEntry);
  });
  await check("built web app shell exists", async () => {
    await access(path.join(webRoot, "index.html"), fsConstants.R_OK);
    return path.relative(rootDir, webRoot);
  });

  await startServer();
  record(true, "isolated Scratch vault created", notesRoot);
  record(true, "local QA server started", baseUrl);

  await check("health endpoint", async () => {
    const { body } = await api("/health");
    assert.equal(body.ok, true);
  });

  await check("static shell security headers", async () => {
    const { response, text } = await api("/");
    assert.match(text, /<div id="root">/u);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'self'/u);
  });

  await check("SPA fallback and static path guard", async () => {
    const settings = await api("/settings");
    assert.match(settings.text, /<div id="root">/u);
    await api("/assets/%5Cbad.js", { expected: 400 });
  });

  await check("list notes excludes ignored internals and symlink fixture", async () => {
    const { body } = await api("/api/notes");
    const ids = body.map((note) => note.id).sort();
    assert.ok(ids.includes("Journal"));
    assert.ok(ids.includes("Projects/Nested"));
    assert.ok(!ids.includes("Linked"));
    assert.ok(!ids.some((id) => id.startsWith(".scratch/")));
    return `${ids.length} visible notes`;
  });

  await check("symlinked note read is rejected", async () => {
    const { body } = await api("/api/notes/Linked", { expected: 400 });
    assert.equal(body.error.code, "SYMLINK_REJECTED");
  });

  await check("create note in root", async () => {
    const { body } = await api("/api/notes", { method: "POST", body: {}, expected: 201 });
    createdNote = body;
    assert.match(createdNote.id, /^QA \d{4}-\d{2}-\d{2}/u);
    return createdNote.id;
  });

  await check("save note, rename from title, and preserve frontmatter text", async () => {
    const read = await api(`/api/notes/${encodeURIComponent(createdNote.id)}`);
    const content = [
      "---",
      "qa: true",
      "---",
      "# QA Created Note",
      "",
      "Saved through the HTTP API.",
      "",
      "[Local link](./Journal.md)"
    ].join("\n");
    const saved = await api(`/api/notes/${encodeURIComponent(createdNote.id)}`, {
      method: "PUT",
      body: { content, expectedVersion: read.body.version }
    });
    savedNote = saved.body;
    assert.equal(savedNote.id, "QA Created Note");
    assert.match(savedNote.content, /qa: true/u);
    return savedNote.id;
  });

  await check("stale save returns conflict", async () => {
    const stale = await api(`/api/notes/${encodeURIComponent(savedNote.id)}`, {
      method: "PUT",
      body: { content: "# Stale\n", expectedVersion: createdNote.version },
      expected: 409
    });
    assert.equal(stale.body.error.code, "CONFLICT");
  });

  await check("search finds seeded markdown content", async () => {
    const { body } = await api("/api/search?q=rainbow-spark");
    assert.equal(body.length, 1);
    assert.equal(body[0].id, "Journal");
  });

  await check("duplicate note creates copy", async () => {
    const { body } = await api(`/api/notes/${encodeURIComponent(savedNote.id)}/duplicate`, {
      method: "POST",
      body: {},
      expected: 201
    });
    assert.equal(body.id, "QA Created Note (Copy)");
    return body.id;
  });

  await check("folder create, note create in folder, move note", async () => {
    await api("/api/folders", { method: "POST", body: { path: "QA Folder" }, expected: 201 });
    const nested = await api("/api/notes", { method: "POST", body: { targetFolder: "QA Folder" }, expected: 201 });
    const moved = await api(`/api/notes/${encodeURIComponent(nested.body.id)}/move`, {
      method: "PATCH",
      body: { targetFolder: "" }
    });
    movedNoteId = moved.body.id;
    assert.ok(!movedNoteId.includes("/"));
    return movedNoteId;
  });

  await check("folder rename and move", async () => {
    await api("/api/folders", { method: "POST", body: { path: "Parent" }, expected: 201 });
    await api(`/api/folders/${encodeURIComponent("QA Folder")}/rename`, {
      method: "PATCH",
      body: { newName: "QA Renamed" }
    });
    await api(`/api/folders/${encodeURIComponent("QA Renamed")}/move`, {
      method: "PATCH",
      body: { targetParent: "Parent" }
    });
    const { body } = await api("/api/folders");
    assert.ok(body.includes("Parent/QA Renamed"));
  });

  await check("folder delete creates backups for contained notes", async () => {
    const before = await bridge.listBackups();
    const contained = await api("/api/notes", { method: "POST", body: { targetFolder: "Parent/QA Renamed" }, expected: 201 });
    assert.ok(contained.body.id.startsWith("Parent/QA Renamed/"));
    await api(`/api/folders/${encodeURIComponent("Parent/QA Renamed")}`, { method: "DELETE", body: {} });
    const after = await bridge.listBackups();
    assert.ok(after.length > before.length);
    return `${after.length - before.length} backup metadata entries added`;
  });

  await check("delete note creates backup", async () => {
    const before = await bridge.listBackups();
    await api(`/api/notes/${encodeURIComponent(movedNoteId)}`, { method: "DELETE", body: {} });
    const after = await bridge.listBackups();
    assert.ok(after.length > before.length);
  });

  await check("settings update preserves unknown keys and ignored folders", async () => {
    await api("/api/settings", {
      method: "PUT",
      body: {
        theme: { mode: "dark" },
        saveMode: "manual",
        foldersEnabled: false,
        ignoredPatterns: ["Ignored"],
        pinnedNoteIds: ["Journal"],
        unknownFutureSetting: "preserve-me"
      }
    });
    const { body } = await api("/api/settings");
    assert.equal(body.theme.mode, "dark");
    assert.equal(body.saveMode, "manual");
    assert.equal(body.foldersEnabled, false);
    assert.equal(body.unknownFutureSetting, "preserve-me");
    const notes = await api("/api/notes");
    assert.ok(!notes.body.some((note) => note.id === "Ignored/Hidden"));
  });

  await check("asset import, serve, and MIME rejection", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l8hP4wAAAABJRU5ErkJggg==", "base64");
    const imported = await api("/api/assets/import", {
      method: "POST",
      body: { filename: "../avatar.png", mimeType: "image/png", dataBase64: png.toString("base64") },
      expected: 201
    });
    assert.equal(imported.body.path, "assets/avatar.png");
    const served = await fetch(`${baseUrl}${imported.body.url}`);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get("content-type"), "image/png");
    assert.equal(served.headers.get("cache-control"), "no-store");
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), png);
    const rejected = await api("/api/assets/import", {
      method: "POST",
      body: { filename: "script.svg", mimeType: "image/svg+xml", dataBase64: Buffer.from("<svg />").toString("base64") },
      expected: 400
    });
    assert.equal(rejected.body.error.code, "INVALID_ASSET_TYPE");
  });

  await check("mutation origin and content-type guards", async () => {
    await api("/api/notes", { method: "POST", body: {}, origin: null, expected: 403 });
    await api("/api/notes", { method: "POST", body: {}, origin: "https://evil.example", expected: 403 });
    await api("/api/notes", {
      method: "POST",
      body: {},
      headers: { origin: baseUrl },
      contentType: "text/plain",
      expected: 415
    });
  });

  await check("git init, status, commit, and unsafe remote rejection", async () => {
    const init = await api("/api/git/init", { method: "POST", body: {} });
    assert.equal(init.body.ok, true);
    await execFileAsync("git", ["-C", notesRoot, "config", "user.email", "qa@example.invalid"]);
    await execFileAsync("git", ["-C", notesRoot, "config", "user.name", "Scratch Web QA"]);
    await writeFile(path.join(notesRoot, "Git Change.md"), "# Git Change\n\nCommitted by isolated QA.\n", "utf8");
    const status = await api("/api/git/status");
    assert.equal(status.body.initialized, true);
    assert.equal(status.body.clean, false);
    const commit = await api("/api/git/commit", { method: "POST", body: { message: "Isolated QA commit" } });
    assert.equal(commit.body.ok, true);
    const unsafe = await api("/api/git/remote", {
      method: "POST",
      body: { url: `file://${path.join(qaRoot, "remote.git")}` },
      expected: 400
    });
    assert.equal(unsafe.body.error.code, "INVALID_GIT_REMOTE");
  });

  await check("SSE ready event", async () => {
    const controller = new AbortController();
    const response = await fetch(`${baseUrl}/api/events`, { signal: controller.signal });
    try {
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "text/event-stream; charset=utf-8");
      const reader = response.body.getReader();
      const first = await reader.read();
      await reader.cancel();
      const payload = new TextDecoder().decode(first.value);
      assert.match(payload, /service\.status\.changed/u);
    } finally {
      controller.abort();
    }
  });

  await check("service worker keeps private APIs network-only", async () => {
    const sw = await readFile(path.join(webRoot, "sw.js"), "utf8");
    assert.match(sw, /NetworkOnly/u);
    assert.match(sw, /\/api/u);
    assert.doesNotMatch(sw, /api\/notes/u);
  });

  await check("desktop Chrome headless render screenshot", () => runChromeScreenshot("desktop", "1440,1000"));
  await check("mobile Chrome headless render screenshot", () => runChromeScreenshot("mobile", "390,844"));

  const failures = results.filter((result) => !result.ok);
  console.log("");
  console.log(`Scratch Web real-world QA evidence: ${qaRoot}`);
  console.log(`Checks: ${results.length - failures.length} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
} finally {
  if (server) {
    await new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      server.close(() => finish());
      server.closeAllConnections?.();
      setTimeout(finish, 2000).unref();
    });
  }
}

process.exit(process.exitCode ?? 0);
