import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import { spawnSync } from "node:child_process";

async function makeHome(): Promise<{ home: string; notes: string }> {
  const home = await mkdtemp(path.join(os.tmpdir(), "scratch-web-cli-"));
  const notes = path.join(home, "notes");
  await mkdir(notes);
  return { home, notes };
}

function runCli(home: string, args: string[]) {
  return spawnSync(process.execPath, [path.resolve("dist/index.js"), ...args], {
    cwd: path.resolve("../cli"),
    encoding: "utf8",
    env: {
      ...process.env,
      SCRATCH_WEB_HOME: home
    }
  });
}

test("setup writes config and launchd mirror without starting services", async () => {
  const { home, notes } = await makeHome();
  const result = runCli(home, ["setup", "--notes-folder", notes, "--service-name", "scratch-web-test"]);
  assert.equal(result.status, 0, result.stderr);

  const config = JSON.parse(await readFile(path.join(home, "config", "config.json"), "utf8")) as {
    notesFolder: string;
    tailnetUrl: string | null;
    tailscaleServiceName: string;
  };
  assert.equal(config.notesFolder, notes);
  assert.equal(config.tailnetUrl, null);
  assert.equal(config.tailscaleServiceName, "scratch-web-test");

  const plist = await readFile(path.join(home, "launchd", "io.github.scratch-web.plist"), "utf8");
  assert.match(plist, /io\.github\.scratch-web/u);
  assert.match(plist, /SCRATCH_WEB_NOTES_ROOT/u);
  assert.match(plist, /<key>HOME<\/key>/u);
  assert.match(plist, /<key>WorkingDirectory<\/key>/u);
  assert.match(plist, /<key>PATH<\/key>/u);
  assert.match(plist, new RegExp(notes.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
});

test("status reports configured notes folder as JSON", async () => {
  const { home, notes } = await makeHome();
  assert.equal(runCli(home, ["setup", "--notes-folder", notes]).status, 0);

  const result = runCli(home, ["status", "--plain"]);
  assert.equal(result.status, 0, result.stderr);
  const status = JSON.parse(result.stdout) as { notesFolder: string; localUrl: string; launchAgentInstalled: boolean; loginStartup: string };
  assert.equal(status.notesFolder, notes);
  assert.match(status.localUrl, /^http:\/\/127\.0\.0\.1:/u);
  assert.equal(status.launchAgentInstalled, false);
  assert.equal(status.loginStartup, "not_installed");
});

test("sensitive actions require explicit confirmation", async () => {
  const { home, notes } = await makeHome();
  assert.equal(runCli(home, ["setup", "--notes-folder", notes]).status, 0);

  const launch = runCli(home, ["launchagent", "install"]);
  assert.notEqual(launch.status, 0);
  assert.match(launch.stderr, /requires --yes/u);

  const serve = runCli(home, ["tailscale", "serve"]);
  assert.notEqual(serve.status, 0);
  assert.match(serve.stderr, /requires --yes/u);
});

test("LaunchAgent install refuses iCloud Drive notes folders by default", async () => {
  const { home } = await makeHome();
  const notes = path.join(home, "Library", "Mobile Documents", "com~apple~CloudDocs", "Scratch");
  await mkdir(notes, { recursive: true });
  assert.equal(runCli(home, ["setup", "--notes-folder", notes]).status, 0);

  const launch = runCli(home, ["launchagent", "install", "--yes"]);
  assert.notEqual(launch.status, 0);
  assert.match(launch.stderr, /iCloud Drive Scratch folders/u);

  const status = runCli(home, ["status", "--plain"]);
  assert.equal(status.status, 0, status.stderr);
  assert.equal(JSON.parse(status.stdout).loginStartup, "unsupported_icloud");
});

test("backup restore requires confirmation and restores the selected manifest entry", async () => {
  const { home, notes } = await makeHome();
  assert.equal(runCli(home, ["setup", "--notes-folder", notes]).status, 0);

  const notePath = path.join(notes, "Restored.md");
  await writeFile(notePath, "# Current\n\n");

  const timestamp = "2026-05-03T12:00:00.000Z";
  const backupPath = path.join(home, "backups", "2026-05-03", "Restored.md");
  await mkdir(path.dirname(backupPath), { recursive: true });
  await writeFile(backupPath, "# Restored\n\n");
  const entry = {
    timestamp,
    action: "overwrite",
    noteId: "Restored",
    originalPath: notePath,
    backupPath,
    previousHash: "before",
    newHash: "after",
  };
  await writeFile(path.join(home, "backups", "manifest.jsonl"), `${JSON.stringify(entry)}\n`);

  const withoutConfirmation = runCli(home, ["backups", "restore", "--timestamp", timestamp]);
  assert.notEqual(withoutConfirmation.status, 0);
  assert.match(withoutConfirmation.stderr, /requires --yes/u);

  const restored = runCli(home, ["backups", "restore", "--timestamp", timestamp, "--yes"]);
  assert.equal(restored.status, 0, restored.stderr);
  assert.equal(await readFile(notePath, "utf8"), "# Restored\n\n");
  assert.match(restored.stdout, /Previous file copy:/u);
});

test("backup restore refuses manifest entries outside the configured notes folder", async () => {
  const { home, notes } = await makeHome();
  assert.equal(runCli(home, ["setup", "--notes-folder", notes]).status, 0);

  const backupPath = path.join(home, "backups", "2026-05-03", "Unsafe.md");
  await mkdir(path.dirname(backupPath), { recursive: true });
  await writeFile(backupPath, "# Unsafe\n\n");
  const entry = {
    timestamp: "2026-05-03T12:10:00.000Z",
    action: "overwrite",
    noteId: "Unsafe",
    originalPath: path.join(home, "outside.md"),
    backupPath,
    previousHash: "before",
  };
  await writeFile(path.join(home, "backups", "manifest.jsonl"), `${JSON.stringify(entry)}\n`);

  const restored = runCli(home, ["backups", "restore", "--timestamp", entry.timestamp, "--yes"]);
  assert.notEqual(restored.status, 0);
  assert.match(restored.stderr, /outside the configured notes folder/u);
});

test("device-smoke prints a phone checklist without exposing local notes paths", async () => {
  const { home, notes } = await makeHome();
  assert.equal(runCli(home, ["setup", "--notes-folder", notes]).status, 0);

  const configPath = path.join(home, "config", "config.json");
  const config = JSON.parse(await readFile(configPath, "utf8")) as Record<string, unknown>;
  await writeFile(
    configPath,
    `${JSON.stringify({ ...config, tailnetUrl: "https://scratch-web.example.ts.net" }, null, 2)}\n`,
  );

  const result = runCli(home, ["device-smoke"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Device smoke checklist/u);
  assert.match(result.stdout, /URL: https:\/\/.+|URL: http:\/\/127\.0\.0\.1:/u);
  assert.match(result.stdout, /iPhone Safari/u);
  assert.match(result.stdout, /Android Chrome/u);
  assert.match(result.stdout, /Create a throwaway note/u);
  assert.doesNotMatch(result.stdout, new RegExp(notes.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
});
