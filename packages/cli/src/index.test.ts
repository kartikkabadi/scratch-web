import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtemp, mkdir, readFile } from "node:fs/promises";
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
