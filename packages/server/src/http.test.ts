import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import type { AddressInfo } from "node:net";
import { createScratchHttpServer, ScratchBridge } from "./index.js";

async function startTestServer(options: { webRoot?: string } = {}) {
  const home = await mkdtemp(path.join(os.tmpdir(), "scratch-web-http-"));
  const bridge = new ScratchBridge({
    notesRoot: path.join(home, "notes"),
    backupsRoot: path.join(home, "backups")
  });
  await bridge.initialize();
  const server = createScratchHttpServer({
    bridge,
    host: "127.0.0.1",
    port: 0,
    ...(options.webRoot ? { webRoot: options.webRoot } : {})
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return { baseUrl, bridge, home, close: () => new Promise<void>((resolve) => server.close(() => resolve())) };
}

test("HTTP API supports create, read, save, search, and origin rejection", async () => {
  const server = await startTestServer();
  try {
    const createdResponse = await fetch(`${server.baseUrl}/api/notes`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: server.baseUrl },
      body: JSON.stringify({})
    });
    assert.equal(createdResponse.status, 201);
    const created = await createdResponse.json() as { id: string; version: unknown };

    const readResponse = await fetch(`${server.baseUrl}/api/notes/${encodeURIComponent(created.id)}`);
    assert.equal(readResponse.status, 200);
    const note = await readResponse.json() as { id: string; version: unknown };

    const saveResponse = await fetch(`${server.baseUrl}/api/notes/${encodeURIComponent(note.id)}`, {
      method: "PUT",
      headers: { "content-type": "application/json", origin: server.baseUrl },
      body: JSON.stringify({ content: "# API\n\nSearchable", expectedVersion: note.version })
    });
    assert.equal(saveResponse.status, 200);

    const searchResponse = await fetch(`${server.baseUrl}/api/search?q=searchable`);
    assert.equal(searchResponse.status, 200);
    const results = await searchResponse.json() as unknown[];
    assert.equal(results.length, 1);

    const rejected = await fetch(`${server.baseUrl}/api/notes`, {
      method: "GET",
      headers: { origin: "https://evil.example" }
    });
    assert.equal(rejected.status, 403);

    const badMutation = await fetch(`${server.baseUrl}/api/notes`, {
      method: "POST",
      body: JSON.stringify({})
    });
    assert.equal(badMutation.status, 403);
  } finally {
    await server.close();
  }
});

test("HTTP API blocks setup-only and backup metadata routes", async () => {
  const server = await startTestServer();
  try {
    const notesFolder = await fetch(`${server.baseUrl}/api/notes-folder`, {
      method: "PUT",
      headers: { "content-type": "application/json", origin: server.baseUrl },
      body: JSON.stringify({ path: "/tmp/other-notes" })
    });
    assert.equal(notesFolder.status, 403);

    const backups = await fetch(`${server.baseUrl}/api/backups`);
    assert.equal(backups.status, 404);
  } finally {
    await server.close();
  }
});

test("HTTP API preserves unknown settings fields for Scratch compatibility", async () => {
  const server = await startTestServer();
  try {
    const response = await fetch(`${server.baseUrl}/api/settings`, {
      method: "PUT",
      headers: { "content-type": "application/json", origin: server.baseUrl },
      body: JSON.stringify({ theme: { mode: "dark" }, unexpected: true })
    });
    assert.equal(response.status, 200);

    const settingsResponse = await fetch(`${server.baseUrl}/api/settings`);
    assert.equal(settingsResponse.status, 200);
    const settings = await settingsResponse.json() as { theme: { mode: string }; unexpected?: boolean };
    assert.equal(settings.theme.mode, "dark");
    assert.equal(settings.unexpected, true);
  } finally {
    await server.close();
  }
});

test("HTTP API exposes Git status and blocks unsafe remote URLs", async () => {
  const server = await startTestServer();
  try {
    const init = await fetch(`${server.baseUrl}/api/git/init`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: server.baseUrl },
      body: JSON.stringify({})
    });
    assert.equal(init.status, 200);

    const status = await fetch(`${server.baseUrl}/api/git/status`);
    assert.equal(status.status, 200);
    const body = await status.json() as { initialized: boolean };
    assert.equal(body.initialized, true);

    const unsafeRemote = await fetch(`${server.baseUrl}/api/git/remote`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: server.baseUrl },
      body: JSON.stringify({ url: "https://example.com/repo.git\n--upload-pack=evil" })
    });
    assert.equal(unsafeRemote.status, 400);
  } finally {
    await server.close();
  }
});

test("HTTP API imports and serves safe image assets only", async () => {
  const server = await startTestServer();
  try {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l8hP4wAAAABJRU5ErkJggg==", "base64");
    const imported = await fetch(`${server.baseUrl}/api/assets/import`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: server.baseUrl },
      body: JSON.stringify({ filename: "../avatar.png", mimeType: "image/png", dataBase64: png.toString("base64") })
    });
    assert.equal(imported.status, 201);
    const asset = await imported.json() as { path: string; url: string; mimeType: string };
    assert.equal(asset.path, "assets/avatar.png");
    assert.equal(asset.mimeType, "image/png");

    const served = await fetch(`${server.baseUrl}${asset.url}`);
    assert.equal(served.status, 200);
    assert.equal(served.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await served.arrayBuffer()), png);

    const rejected = await fetch(`${server.baseUrl}/api/assets/import`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: server.baseUrl },
      body: JSON.stringify({ filename: "script.svg", mimeType: "image/svg+xml", dataBase64: Buffer.from("<svg />").toString("base64") })
    });
    assert.equal(rejected.status, 400);
  } finally {
    await server.close();
  }
});

test("HTTP API exposes realtime events as SSE", async () => {
  const server = await startTestServer();
  const controller = new AbortController();
  try {
    const response = await fetch(`${server.baseUrl}/api/events`, { signal: controller.signal });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "text/event-stream; charset=utf-8");
    const reader = response.body?.getReader();
    assert.ok(reader);
    const first = await reader.read();
    assert.equal(first.done, false);
    assert.match(new TextDecoder().decode(first.value), /service\.status\.changed/u);
    await reader.cancel();
    controller.abort();
  } finally {
    await server.close();
  }
});

test("HTTP server serves static app shell with SPA fallback", async () => {
  const webRoot = await mkdtemp(path.join(os.tmpdir(), "scratch-web-static-"));
  await mkdir(path.join(webRoot, "assets"));
  await writeFile(path.join(webRoot, "index.html"), "<!doctype html><title>Scratch Web</title>");
  await writeFile(path.join(webRoot, "assets", "app.js"), "console.log('ok');");

  const server = await startTestServer({ webRoot });
  try {
    const index = await fetch(`${server.baseUrl}/`);
    assert.equal(index.status, 200);
    assert.equal(index.headers.get("content-type"), "text/html; charset=utf-8");
    assert.match(await index.text(), /Scratch Web/u);

    const asset = await fetch(`${server.baseUrl}/assets/app.js`);
    assert.equal(asset.status, 200);
    assert.equal(asset.headers.get("content-type"), "text/javascript; charset=utf-8");

    const fallback = await fetch(`${server.baseUrl}/settings`);
    assert.equal(fallback.status, 200);
    assert.match(await fallback.text(), /Scratch Web/u);
  } finally {
    await server.close();
  }
});
