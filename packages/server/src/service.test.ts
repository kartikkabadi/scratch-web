import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import { ScratchBridge, ScratchWebError, absPathFromId, startFileWatcher, validateNoteId } from "./index.js";

async function makeBridge(): Promise<{ bridge: ScratchBridge; notesRoot: string; home: string }> {
  const home = await mkdtemp(path.join(os.tmpdir(), "scratch-web-test-"));
  const notesRoot = path.join(home, "notes");
  const bridge = new ScratchBridge({
    notesRoot,
    backupsRoot: path.join(home, "backups")
  });
  await bridge.initialize();
  return { bridge, notesRoot, home };
}

test("validateNoteId rejects traversal and reserved directories", () => {
  assert.throws(() => validateNoteId("../secret"), ScratchWebError);
  assert.throws(() => validateNoteId("/tmp/secret"), ScratchWebError);
  assert.throws(() => validateNoteId(".git/config"), ScratchWebError);
  assert.throws(() => validateNoteId("folder\\note"), ScratchWebError);
});

test("notes CRUD, search, settings, and folders work", async () => {
  const { bridge, notesRoot } = await makeBridge();
  await bridge.updateSettings({ theme: { mode: "dark" }, pinnedNoteIds: [], upstreamOnlyFutureSetting: "keep-me" });
  assert.equal((await bridge.getSettings()).theme.mode, "dark");
  await bridge.updateSettings({ theme: { mode: "system" }, saveMode: "manual" });
  assert.equal((await bridge.getSettings()).upstreamOnlyFutureSetting, "keep-me");
  assert.equal((await bridge.getSettings()).saveMode, "manual");

  await bridge.createFolder("Work");
  const created = await bridge.createNote("Work");
  assert.match(created.id, /^Work\/Untitled/u);

  const saved = await bridge.saveNote({
    id: created.id,
    content: "# Roadmap\n\nAlpha beta",
    expectedVersion: created.version
  });
  assert.equal(saved.title, "Roadmap");
  assert.equal(await readFile(absPathFromId(notesRoot, saved.id), "utf8"), "# Roadmap\n\nAlpha beta");

  const notes = await bridge.listNotes();
  assert.equal(notes.length, 1);
  assert.equal(notes[0]?.id, saved.id);

  const folders = await bridge.listFolders();
  assert.deepEqual(folders, ["Work"]);

  const results = await bridge.searchNotes("alpha");
  assert.equal(results.length, 1);
  assert.equal(results[0]?.id, saved.id);
});

test("existing saves require current version and create backups", async () => {
  const { bridge } = await makeBridge();
  const note = await bridge.saveNote({ id: null, content: "# First\n\nBody" });
  await writeFile(note.path, "# First\n\nExternal edit");

  await assert.rejects(
    bridge.saveNote({ id: note.id, content: "# First\n\nMine", expectedVersion: note.version }),
    /changed on disk/u
  );

  const current = await bridge.readNote(note.id);
  const saved = await bridge.saveNote({
    id: current.id,
    content: "# First\n\nSafe edit",
    expectedVersion: current.version
  });
  assert.equal(saved.content, "# First\n\nSafe edit");
  const backups = await bridge.listBackups();
  assert.equal(backups.length, 1);
  assert.equal(backups[0]?.action, "overwrite");
});

test("renaming a pinned note updates settings", async () => {
  const { bridge } = await makeBridge();
  const note = await bridge.saveNote({ id: null, content: "# Original\n\nBody" });
  await bridge.updateSettings({
    theme: { mode: "system" },
    pinnedNoteIds: [note.id]
  });

  const renamed = await bridge.saveNote({
    id: note.id,
    content: "# Renamed\n\nBody",
    expectedVersion: note.version
  });

  assert.notEqual(renamed.id, note.id);
  assert.deepEqual((await bridge.getSettings()).pinnedNoteIds, [renamed.id]);
});

test("delete creates backup and symlink writes are rejected", async () => {
  const { bridge, notesRoot, home } = await makeBridge();
  const note = await bridge.saveNote({ id: null, content: "# Delete Me\n\nBody" });
  await bridge.deleteNote(note.id);
  assert.equal((await bridge.listBackups()).at(-1)?.action, "delete");

  const outside = path.join(home, "outside.md");
  await writeFile(outside, "# Outside");
  const linkPath = path.join(notesRoot, "Linked.md");
  await symlink(outside, linkPath);
  await assert.rejects(
    bridge.saveNote({ id: "Linked", content: "# Linked\n\nOops", expectedVersion: await bridge.readNote("Linked").then((n) => n.version) }),
    /Symlink/u
  );
});

test("writes reject symlinked parent directories", async () => {
  const { bridge, notesRoot, home } = await makeBridge();
  const outside = path.join(home, "outside");
  const linkedFolder = path.join(notesRoot, "LinkedFolder");
  await mkdir(outside);
  await symlink(outside, linkedFolder);

  await assert.rejects(bridge.createNote("LinkedFolder"), /Symlink/u);
  await assert.rejects(bridge.createFolder("LinkedFolder/Nested"), /Symlink/u);

  const note = await bridge.saveNote({ id: null, content: "# Move Me\n\nBody" });
  await assert.rejects(bridge.moveNote(note.id, "LinkedFolder"), /Symlink/u);

  const folder = path.join(notesRoot, "RealFolder");
  await mkdir(folder);
  await assert.rejects(bridge.moveFolder("RealFolder", "LinkedFolder"), /Symlink/u);
});

test("folder delete backs up contained notes before removing them", async () => {
  const { bridge } = await makeBridge();
  await bridge.createFolder("Archive");
  const first = await bridge.saveNote({ id: null, content: "# First\n\nBody" });
  await bridge.moveNote(first.id, "Archive");
  const second = await bridge.createNote("Archive");

  await bridge.deleteFolder("Archive");

  const backups = await bridge.listBackups();
  assert.equal(backups.filter((entry) => entry.action === "delete").length, 2);
  assert.deepEqual(await bridge.listNotes(), []);
});

test("file watcher emits note changes", async () => {
  const { notesRoot } = await makeBridge();
  const eventPromise = new Promise<string[]>((resolve, reject) => {
    const watcher = startFileWatcher(notesRoot, (event) => {
      watcher.close();
      resolve(event.changedIds);
    });
    setTimeout(() => {
      void writeFile(path.join(notesRoot, "Watched.md"), "# Watched\n");
    }, 50);
    setTimeout(() => {
      watcher.close();
      reject(new Error("Timed out waiting for watcher event."));
    }, 2000);
  });
  assert.deepEqual(await eventPromise, ["Watched"]);
});

test("Git helpers initialize repository and report changed files", async () => {
  const { bridge, notesRoot } = await makeBridge();
  const availability = await bridge.getGitAvailability();
  if (!availability.available) {
    return;
  }

  const init = await bridge.initGit();
  assert.equal(init.ok, true);
  assert.equal(init.status.initialized, true);

  await writeFile(path.join(notesRoot, "Git Note.md"), "# Git Note\n");
  const status = await bridge.getGitStatus();
  assert.equal(status.initialized, true);
  assert.equal(status.clean, false);
  assert.ok(status.entries.some((entry) => entry.path === "Git Note.md"));
});

test("asset import validates MIME signatures and writes under assets only", async () => {
  const { bridge, notesRoot } = await makeBridge();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l8hP4wAAAABJRU5ErkJggg==", "base64");
  const asset = await bridge.importAsset({
    filename: "../Logo.png",
    mimeType: "image/png",
    dataBase64: png.toString("base64")
  });

  assert.equal(asset.path, "assets/Logo.png");
  assert.equal(await readFile(path.join(notesRoot, "assets", "Logo.png"), "base64"), png.toString("base64"));

  await assert.rejects(
    bridge.importAsset({
      filename: "not-a-png.png",
      mimeType: "image/png",
      dataBase64: Buffer.from("not an image").toString("base64")
    }),
    /does not match/u
  );
});

test("asset imports reject a symlinked assets directory", async () => {
  const { bridge, notesRoot, home } = await makeBridge();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/l8hP4wAAAABJRU5ErkJggg==", "base64");
  const outsideAssets = path.join(home, "outside-assets");
  await rm(path.join(notesRoot, "assets"), { recursive: true, force: true });
  await mkdir(outsideAssets);
  await symlink(outsideAssets, path.join(notesRoot, "assets"));

  await assert.rejects(
    bridge.importAsset({
      filename: "Logo.png",
      mimeType: "image/png",
      dataBase64: png.toString("base64")
    }),
    /Symlink/u
  );
});
