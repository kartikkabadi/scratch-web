#!/usr/bin/env node

import { access, appendFile, chmod, copyFile, lstat, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { createDefaultServerConfig } from "@scratch-web/server";
import type { BackupManifestEntry, ServiceStatus } from "@scratch-web/shared";

const COMMANDS = [
  "setup",
  "status",
  "doctor",
  "start",
  "stop",
  "restart",
  "logs",
  "config",
  "launchagent",
  "tailscale",
  "device-smoke",
  "update",
  "uninstall",
  "backups"
] as const;

export type ScratchWebCommand = (typeof COMMANDS)[number];

interface LocalConfig {
  notesFolder: string | null;
  host: string;
  port: number;
  authEnabled: boolean;
  tailnetUrl: string | null;
  tailscaleServiceName: string;
  launchAgentInstalled: boolean;
}

interface TailscaleStatus {
  installed: boolean;
  version: string | null;
  loggedIn: boolean;
  serveConfigured: boolean;
  funnelEnabled: boolean;
  tailnetUrl: string | null;
  error: string | null;
}

const rootDir = process.env.SCRATCH_WEB_HOME ?? path.join(os.homedir(), ".scratch-web");
const appDir = path.join(rootDir, "app");
const binDir = path.join(rootDir, "bin");
const configDir = path.join(rootDir, "config");
const runDir = path.join(rootDir, "run");
const logsDir = path.join(rootDir, "logs");
const launchdDir = path.join(rootDir, "launchd");
const configPath = path.join(configDir, "config.json");
const pidPath = path.join(runDir, "scratch-web.pid");
const logPath = path.join(logsDir, "service.log");
const launchAgentLabel = "io.github.scratch-web";
const launchAgentFile = `${launchAgentLabel}.plist`;
const launchAgentMirrorPath = path.join(launchdDir, launchAgentFile);
const userLaunchAgentPath = path.join(os.homedir(), "Library", "LaunchAgents", launchAgentFile);

export function printHelp(): void {
  console.log(`Scratch Web CLI

Usage:
  scratch-web <command> [options]

Commands:
  setup --notes-folder <path> [--configure-serve] [--service-name <name>]
  status [--plain]             Show service, notes folder, and Tailscale status
  doctor                       Run friendly diagnostics
  start [--foreground]         Start the local server
  stop                         Stop the local server
  restart                      Restart the local server
  logs [--tail]                Show or follow the service log
  config                       Print local config
  launchagent install          Install the login service for non-iCloud folders
  launchagent install --allow-icloud
                               Testing override for iCloud Drive folders
  launchagent uninstall        Remove the login service
  launchagent print            Print the generated plist
  tailscale status             Show Tailscale status
  tailscale serve --yes        Configure private Tailscale Serve
  device-smoke                 Print the real-phone Tailnet smoke checklist
  update --yes                 Update source checkout and rebuild
  uninstall                    Stop service and remove LaunchAgent/config prompts
  backups list                 List local backup manifest entries
  backups restore --timestamp <iso> --yes
                               Restore one backup entry after confirmation
`);
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const command = argv[0];

  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  if (!COMMANDS.includes(command as ScratchWebCommand)) {
    throw new Error(`Unknown command: ${command}`);
  }

  switch (command as ScratchWebCommand) {
    case "setup":
      await setup(argv.slice(1));
      break;
    case "status":
      await printStatus(argv.slice(1));
      break;
    case "doctor":
      await doctor();
      break;
    case "start":
      await start({ foreground: argv.includes("--foreground") });
      break;
    case "stop":
      await stop();
      break;
    case "restart":
      await stop();
      await start({ foreground: argv.includes("--foreground") });
      break;
    case "logs":
      await logs(argv.slice(1));
      break;
    case "config":
      console.log(JSON.stringify(await readConfig(), null, 2));
      break;
    case "launchagent":
      await launchAgent(argv.slice(1));
      break;
    case "tailscale":
      await tailscale(argv.slice(1));
      break;
    case "device-smoke":
      await deviceSmoke();
      break;
    case "backups":
      await backups(argv.slice(1));
      break;
    case "update":
      await update(argv.slice(1));
      break;
    case "uninstall":
      await uninstall();
      break;
  }
}

async function setup(args: string[]): Promise<void> {
  const notesFolder = readOption(args, "--notes-folder");
  if (!notesFolder) {
    throw new Error("Please pass --notes-folder <path>. The setup wizard must confirm this with the user first.");
  }

  const defaults = createDefaultServerConfig();
  const notesStats = await stat(notesFolder).catch(() => null);
  if (!notesStats?.isDirectory()) {
    throw new Error(`Notes folder does not exist or is not a folder: ${notesFolder}`);
  }
  await access(notesFolder);

  await ensureLocalDirs();
  const current = await readConfig();
  const serviceName = readOption(args, "--service-name") ?? current.tailscaleServiceName ?? "scratch-web";
  const config: LocalConfig = {
    notesFolder: path.resolve(notesFolder),
    host: current.host ?? defaults.host,
    port: Number(readOption(args, "--port") ?? current.port ?? defaults.port),
    authEnabled: current.authEnabled ?? false,
    tailnetUrl: current.tailnetUrl ?? null,
    tailscaleServiceName: serviceName,
    launchAgentInstalled: await exists(userLaunchAgentPath)
  };
  await writeConfig(config);
  await writeLaunchAgentMirror(config);

  console.log(`Configured Scratch Web for: ${config.notesFolder}`);
  console.log(`Local URL: http://${config.host}:${config.port}`);
  console.log(`Runtime files: ${rootDir}`);

  if (args.includes("--configure-serve")) {
    if (!args.includes("--yes")) {
      throw new Error("Configuring Tailscale Serve requires --yes after the user confirms.");
    }
    await configureTailscaleServe(config);
  }
}

async function printStatus(args: string[]): Promise<void> {
  const status = await getStatus();
  if (args.includes("--plain")) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }
  printFriendlyStatus(status);
}

async function doctor(): Promise<void> {
  const status = await getStatus();
  const notesWritable = Boolean(status.notesFolder && await awaitCanWrite(status.notesFolder));
  printFriendlyStatus(status);
  console.log();
  console.log("Doctor checks:");
  printCheck("macOS", process.platform === "darwin", "Scratch Web setup is designed for macOS.");
  printCheck("git", commandExists("git"), "Install Git before using release/update flows.");
  printCheck("node", commandExists("node"), "Install Node.js 22 or newer.");
  printCheck("pnpm", commandExists("pnpm"), "Install pnpm before building from source.");
  printCheck("launchd", commandExists("launchctl"), "launchctl is required for the login service.");
  printCheck("Tailscale", status.tailscaleInstalled, "Install Tailscale and log in.");
  printCheck("Tailscale logged in", status.tailscaleLoggedIn, "Open Tailscale and sign in.");
  printCheck("Tailscale Serve", status.tailscaleServeConfigured, "Run scratch-web tailscale serve --yes after confirming.");
  printCheck("Funnel disabled", !status.funnelEnabled, "Disable Funnel for Scratch Web.");
  printCheck("Notes folder writable", notesWritable, "Choose a writable Scratch notes folder.");
  printCheck("Login startup", status.loginStartup === "enabled", loginStartupHelp(status));
}

async function start(options: { foreground: boolean }): Promise<void> {
  const config = await readConfig();
  if (!config.notesFolder) {
    throw new Error("Run scratch-web setup --notes-folder <path> first.");
  }
  await ensureLocalDirs();
  if (options.foreground) {
    await runServerForeground(config);
    return;
  }
  if (await exists(userLaunchAgentPath)) {
    runLaunchctl(["bootout", `gui/${process.getuid?.() ?? os.userInfo().uid}`, userLaunchAgentPath], { allowFailure: true });
    runLaunchctl(["bootstrap", `gui/${process.getuid?.() ?? os.userInfo().uid}`, userLaunchAgentPath], { allowFailure: false });
    runLaunchctl(["enable", `gui/${process.getuid?.() ?? os.userInfo().uid}/${launchAgentLabel}`], { allowFailure: true });
    console.log("Started Scratch Web LaunchAgent.");
    return;
  }

  const existing = await readPid();
  if (existing && isProcessAlive(existing)) {
    console.log(`Scratch Web is already running with pid ${existing}.`);
    return;
  }
  const child = spawn(process.execPath, [serverEntryPath()], {
    detached: true,
    stdio: ["ignore", "ignore", "ignore"],
    env: serverEnv(config)
  });
  child.unref();
  await writeFile(pidPath, `${child.pid ?? ""}\n`, { mode: 0o600 });
  console.log(`Started Scratch Web on http://${config.host}:${config.port}`);
}

async function stop(): Promise<void> {
  if (await exists(userLaunchAgentPath)) {
    const pid = await readPid();
    runLaunchctl(["bootout", `gui/${process.getuid?.() ?? os.userInfo().uid}`, userLaunchAgentPath], { allowFailure: true });
    if (pid && isProcessAlive(pid)) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Already stopped.
      }
    }
    await rm(pidPath, { force: true });
    console.log("Stopped Scratch Web LaunchAgent.");
    return;
  }

  const pid = await readPid();
  if (!pid) {
    console.log("Scratch Web is not running.");
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {
    // Already stopped.
  }
  await rm(pidPath, { force: true });
  console.log("Stopped Scratch Web.");
}

async function logs(args: string[]): Promise<void> {
  await ensureLocalDirs();
  if (args.includes("--tail")) {
    const tail = spawn("tail", ["-f", logPath], { stdio: "inherit" });
    await new Promise((resolve) => tail.on("exit", resolve));
    return;
  }
  console.log(logPath);
}

async function launchAgent(args: string[]): Promise<void> {
  const action = args[0] ?? "print";
  const config = await readConfig();
  if (action === "print") {
    console.log(generateLaunchAgentPlist(config));
    return;
  }
  if (action === "install") {
    if (!config.notesFolder) {
      throw new Error("Run setup before installing the LaunchAgent.");
    }
    if (!args.includes("--yes")) {
      throw new Error("Installing a LaunchAgent requires --yes after the user confirms.");
    }
    if (isICloudDrivePath(config.notesFolder) && !args.includes("--allow-icloud")) {
      throw new Error(
        "LaunchAgent startup is currently disabled for iCloud Drive Scratch folders because macOS can hang note reads from launchd. Use scratch-web start for now, or pass --allow-icloud only if you are deliberately testing this issue.",
      );
    }
    await installLaunchAgent(config);
    console.log(`Installed LaunchAgent: ${userLaunchAgentPath}`);
    return;
  }
  if (action === "uninstall") {
    if (!args.includes("--yes")) {
      throw new Error("Removing a LaunchAgent requires --yes after the user confirms.");
    }
    await uninstallLaunchAgent();
    console.log("Removed Scratch Web LaunchAgent.");
    return;
  }
  throw new Error(`Unknown launchagent action: ${action}`);
}

async function tailscale(args: string[]): Promise<void> {
  const action = args[0] ?? "status";
  if (action === "status") {
    console.log(JSON.stringify(await getTailscaleStatus(await readConfig()), null, 2));
    return;
  }
  if (action === "serve") {
    if (!args.includes("--yes")) {
      throw new Error("Configuring Tailscale Serve requires --yes after the user confirms.");
    }
    await configureTailscaleServe(await readConfig());
    return;
  }
  throw new Error(`Unknown tailscale action: ${action}`);
}

async function deviceSmoke(): Promise<void> {
  const status = await getStatus();
  const url = status.tailnetUrl ?? status.localUrl ?? "not configured";
  console.log("Device smoke checklist");
  console.log();
  console.log(`URL: ${url}`);
  console.log();
  console.log("1. Connect the phone to the same Tailnet.");
  console.log("2. Open the URL in iPhone Safari.");
  console.log("3. Open the sidebar, open a note, open Settings, toggle source mode, and use find-in-note.");
  console.log("4. Open the URL in Android Chrome and repeat the same checks.");
  console.log("5. Create a throwaway note, edit it, confirm it saves on the Mac, then delete the throwaway note.");
  console.log();
  console.log("Do not copy private note text into screenshots, prompts, or bug reports.");
  if (status.loginStartup === "unsupported_icloud") {
    console.log("Note: this iCloud-backed setup uses scratch-web start; LaunchAgent login startup is intentionally disabled.");
  }
}

async function backups(args: string[]): Promise<void> {
  const action = args[0] ?? "list";
  if (action === "restore") {
    await restoreBackup(args.slice(1));
    return;
  }
  if (action !== "list") {
    throw new Error(`Unknown backups action: ${action}`);
  }
  const entries = await readBackupManifest();
  if (entries.length === 0) {
    console.log("No backups yet.");
    return;
  }
  console.log(entries.map((entry) => JSON.stringify(entry)).join("\n"));
}

async function restoreBackup(args: string[]): Promise<void> {
  if (!args.includes("--yes")) {
    throw new Error("Restoring a backup requires --yes after the user confirms.");
  }
  const timestamp = readOption(args, "--timestamp");
  if (!timestamp) {
    throw new Error("Restoring a backup requires --timestamp <iso> from scratch-web backups list.");
  }

  const config = await readConfig();
  if (!config.notesFolder) {
    throw new Error("Run setup before restoring backups.");
  }

  const entry = (await readBackupManifest()).find((candidate) => candidate.timestamp === timestamp);
  if (!entry) {
    throw new Error(`No backup entry found for timestamp: ${timestamp}`);
  }

  const backupsRoot = path.join(rootDir, "backups");
  const backupPath = path.resolve(entry.backupPath);
  const notesRoot = path.resolve(config.notesFolder);
  const originalPath = path.resolve(entry.originalPath);
  assertPathInside(backupsRoot, backupPath, "Backup path is outside the Scratch Web backups folder.");
  assertPathInside(notesRoot, originalPath, "Refusing to restore outside the configured notes folder.");
  await assertNoSymlinkInPath(backupsRoot, backupPath);
  await assertNoSymlinkInPath(notesRoot, originalPath);
  const backupStats = await lstat(backupPath);
  if (!backupStats.isFile()) {
    throw new Error("Backup entry does not point to a file.");
  }

  let safetyCopy: string | null = null;
  if (await exists(originalPath)) {
    const safetyLeaf = `${entry.noteId.split("/").map(encodeURIComponent).join("__") || "note"}-${formatBackupTimestamp(new Date())}.md`;
    safetyCopy = path.join(backupsRoot, "restore-safety", safetyLeaf);
    await mkdir(path.dirname(safetyCopy), { recursive: true, mode: 0o700 });
    await copyFile(originalPath, safetyCopy);
    await chmod(safetyCopy, 0o600);
  }

  await mkdir(path.dirname(originalPath), { recursive: true, mode: 0o700 });
  await copyFile(backupPath, originalPath);
  await chmod(originalPath, 0o600);
  console.log(`Restored backup ${entry.timestamp} to ${originalPath}`);
  if (safetyCopy) {
    console.log(`Previous file copy: ${safetyCopy}`);
  }
}

async function uninstall(): Promise<void> {
  await stop();
  await uninstallLaunchAgent();
  console.log(`Stopped service and removed LaunchAgent. Config and backups are still preserved in ${rootDir}.`);
}

async function update(args: string[]): Promise<void> {
  if (!args.includes("--yes")) {
    throw new Error("Updating Scratch Web requires --yes after the user confirms.");
  }
  if (!(await exists(path.join(appDir, ".git")))) {
    throw new Error(`No git checkout found at ${appDir}. Re-run the installer with a release tarball or repo URL.`);
  }
  const pull = spawnSync("git", ["-C", appDir, "pull", "--ff-only"], { encoding: "utf8" });
  if (pull.status !== 0) {
    throw new Error(pull.stderr || pull.stdout || "git pull failed.");
  }
  const install = spawnSync("pnpm", ["install", "--frozen-lockfile"], { cwd: appDir, encoding: "utf8" });
  if (install.status !== 0) {
    throw new Error(install.stderr || install.stdout || "pnpm install failed.");
  }
  const build = spawnSync("pnpm", ["build"], { cwd: appDir, encoding: "utf8" });
  if (build.status !== 0) {
    throw new Error(build.stderr || build.stdout || "pnpm build failed.");
  }
  console.log("Scratch Web updated and rebuilt.");
}

async function getStatus(): Promise<ServiceStatus> {
  const config = await readConfig();
  const pid = await readPid();
  const serviceRunning = Boolean(pid && isProcessAlive(pid));
  const tailscaleStatus = await getTailscaleStatus(config);
  const launchAgentInstalled = await exists(userLaunchAgentPath);
  return {
    serviceInstalled: await exists(configPath) || launchAgentInstalled,
    serviceRunning,
    launchAgentInstalled,
    loginStartup: getLoginStartupStatus(config, launchAgentInstalled),
    notesFolder: config.notesFolder,
    localUrl: `http://${config.host}:${config.port}`,
    tailnetUrl: tailscaleStatus.tailnetUrl ?? config.tailnetUrl,
    authEnabled: config.authEnabled,
    tailscaleInstalled: tailscaleStatus.installed,
    tailscaleVersion: tailscaleStatus.version,
    tailscaleLoggedIn: tailscaleStatus.loggedIn,
    tailscaleServeConfigured: tailscaleStatus.serveConfigured,
    funnelEnabled: tailscaleStatus.funnelEnabled,
    recentErrors: await recentErrors()
  };
}

async function getTailscaleStatus(config: LocalConfig): Promise<TailscaleStatus> {
  if (!commandExists("tailscale")) {
    return {
      installed: false,
      version: null,
      loggedIn: false,
      serveConfigured: false,
      funnelEnabled: false,
      tailnetUrl: config.tailnetUrl,
      error: null
    };
  }

  const version = runCapture("tailscale", ["version"]).stdout.split(/\r?\n/u)[0]?.trim() || null;
  const status = runCapture("tailscale", ["status", "--json"]);
  const serve = runCapture("tailscale", ["serve", "status", "--json"]);
  const parsedStatus = parseJson(status.stdout);
  const parsedServe = parseJson(serve.stdout);
  const loggedIn = status.code === 0 && Boolean(parsedStatus);
  const serveText = `${serve.stdout}\n${serve.stderr}`.toLowerCase();
  const tailnetUrl = deriveTailnetUrl(parsedStatus, config.tailscaleServiceName) ?? config.tailnetUrl;
  return {
    installed: true,
    version,
    loggedIn,
    serveConfigured: serve.code === 0 && serveText.includes(String(config.port)),
    funnelEnabled: serveText.includes("funnel"),
    tailnetUrl,
    error: status.code === 0 ? null : status.stderr.trim() || null
  };
}

async function configureTailscaleServe(config: LocalConfig): Promise<void> {
  if (!config.notesFolder) {
    throw new Error("Run setup before configuring Tailscale Serve.");
  }
  if (!commandExists("tailscale")) {
    throw new Error("Tailscale is not installed.");
  }
  const target = `http://${config.host}:${config.port}`;
  const result = spawnSync("tailscale", ["serve", "--bg", target], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "Failed to configure Tailscale Serve.");
  }
  const status = await getTailscaleStatus(config);
  await writeConfig({ ...config, tailnetUrl: status.tailnetUrl });
  console.log(`Configured private Tailscale Serve for ${target}.`);
  if (status.tailnetUrl) {
    console.log(`Open on your phone: ${status.tailnetUrl}`);
  }
  if (status.funnelEnabled) {
    throw new Error("Tailscale Funnel appears to be enabled. Disable Funnel before using Scratch Web.");
  }
}

async function installLaunchAgent(config: LocalConfig): Promise<void> {
  await ensureLocalDirs();
  await mkdir(path.dirname(userLaunchAgentPath), { recursive: true, mode: 0o700 });
  const plist = generateLaunchAgentPlist(config);
  await writeFile(launchAgentMirrorPath, plist, { mode: 0o600 });
  await writeFile(userLaunchAgentPath, plist, { mode: 0o600 });
  await chmod(userLaunchAgentPath, 0o600);
  runLaunchctl(["bootout", `gui/${process.getuid?.() ?? os.userInfo().uid}`, userLaunchAgentPath], { allowFailure: true });
  runLaunchctl(["bootstrap", `gui/${process.getuid?.() ?? os.userInfo().uid}`, userLaunchAgentPath], { allowFailure: false });
  runLaunchctl(["enable", `gui/${process.getuid?.() ?? os.userInfo().uid}/${launchAgentLabel}`], { allowFailure: true });
  await writeConfig({ ...config, launchAgentInstalled: true });
}

async function uninstallLaunchAgent(): Promise<void> {
  runLaunchctl(["bootout", `gui/${process.getuid?.() ?? os.userInfo().uid}`, userLaunchAgentPath], { allowFailure: true });
  await rm(userLaunchAgentPath, { force: true });
  const config = await readConfig();
  await writeConfig({ ...config, launchAgentInstalled: false });
}

function generateLaunchAgentPlist(config: LocalConfig): string {
  const nodePath = process.execPath;
  const cliPath = process.argv[1] ? path.resolve(process.argv[1]) : path.join(binDir, "scratch-web");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${escapePlist(launchAgentLabel)}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${escapePlist(nodePath)}</string>
    <string>${escapePlist(cliPath)}</string>
    <string>start</string>
    <string>--foreground</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>WorkingDirectory</key>
  <string>${escapePlist(os.homedir())}</string>
  <key>StandardOutPath</key>
  <string>${escapePlist(logPath)}</string>
  <key>StandardErrorPath</key>
  <string>${escapePlist(logPath)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>SCRATCH_WEB_HOME</key>
    <string>${escapePlist(rootDir)}</string>
    <key>SCRATCH_WEB_NOTES_ROOT</key>
    <string>${escapePlist(config.notesFolder ?? "")}</string>
    <key>SCRATCH_WEB_HOST</key>
    <string>${escapePlist(config.host)}</string>
    <key>SCRATCH_WEB_PORT</key>
    <string>${escapePlist(String(config.port))}</string>
    <key>HOME</key>
    <string>${escapePlist(os.homedir())}</string>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
  </dict>
</dict>
</plist>
`;
}

async function runServerForeground(config: LocalConfig): Promise<void> {
  const child = spawn(process.execPath, [serverEntryPath()], {
    stdio: ["ignore", "pipe", "pipe"],
    env: serverEnv(config)
  });
  await writeFile(pidPath, `${child.pid ?? ""}\n`, { mode: 0o600 });
  child.stdout.on("data", (chunk) => void appendLog(chunk.toString()));
  child.stderr.on("data", (chunk) => void appendLog(chunk.toString()));
  await new Promise<void>((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) => {
      void rm(pidPath, { force: true });
      if (code && code !== 0) reject(new Error(`Server exited with code ${code}`));
      else resolve();
    });
  });
}

function serverEntryPath(): string {
  return new URL("../../server/dist/run.js", import.meta.url).pathname;
}

function serverEnv(config: LocalConfig): NodeJS.ProcessEnv {
  return {
    ...process.env,
    SCRATCH_WEB_NOTES_ROOT: config.notesFolder ?? "",
    SCRATCH_WEB_HOST: config.host,
    SCRATCH_WEB_PORT: String(config.port),
    SCRATCH_WEB_HOME: rootDir
  };
}

async function readConfig(): Promise<LocalConfig> {
  const defaults = createDefaultServerConfig();
  try {
    const parsed = JSON.parse(await readFile(configPath, "utf8")) as Partial<LocalConfig>;
    return {
      notesFolder: typeof parsed.notesFolder === "string" ? parsed.notesFolder : null,
      host: typeof parsed.host === "string" ? parsed.host : defaults.host,
      port: typeof parsed.port === "number" ? parsed.port : defaults.port,
      authEnabled: parsed.authEnabled === true,
      tailnetUrl: typeof parsed.tailnetUrl === "string" ? parsed.tailnetUrl : null,
      tailscaleServiceName: typeof parsed.tailscaleServiceName === "string" ? parsed.tailscaleServiceName : "scratch-web",
      launchAgentInstalled: parsed.launchAgentInstalled === true
    };
  } catch {
    return {
      notesFolder: null,
      host: defaults.host,
      port: defaults.port,
      authEnabled: false,
      tailnetUrl: null,
      tailscaleServiceName: "scratch-web",
      launchAgentInstalled: false
    };
  }
}

async function writeConfig(config: LocalConfig): Promise<void> {
  await ensureLocalDirs();
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
}

async function ensureLocalDirs(): Promise<void> {
  await Promise.all([
    mkdir(appDir, { recursive: true, mode: 0o700 }),
    mkdir(binDir, { recursive: true, mode: 0o700 }),
    mkdir(configDir, { recursive: true, mode: 0o700 }),
    mkdir(runDir, { recursive: true, mode: 0o700 }),
    mkdir(logsDir, { recursive: true, mode: 0o700 }),
    mkdir(launchdDir, { recursive: true, mode: 0o700 }),
    mkdir(path.join(rootDir, "backups"), { recursive: true, mode: 0o700 })
  ]);
}

async function writeLaunchAgentMirror(config: LocalConfig): Promise<void> {
  await ensureLocalDirs();
  await writeFile(launchAgentMirrorPath, generateLaunchAgentPlist(config), { mode: 0o600 });
}

async function readBackupManifest(): Promise<BackupManifestEntry[]> {
  const manifestPath = path.join(rootDir, "backups", "manifest.jsonl");
  try {
    return (await readFile(manifestPath, "utf8"))
      .split(/\r?\n/u)
      .filter(Boolean)
      .map((line) => JSON.parse(line) as BackupManifestEntry);
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code === "ENOENT") return [];
    throw error;
  }
}

function readOption(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

async function readPid(): Promise<number | null> {
  try {
    const value = Number((await readFile(pidPath, "utf8")).trim());
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function commandExists(command: string): boolean {
  return spawnSync("which", [command], { stdio: "ignore" }).status === 0;
}

function runCapture(command: string, args: string[]): { code: number; stdout: string; stderr: string } {
  const result = spawnSync(command, args, { encoding: "utf8" });
  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

function runLaunchctl(args: string[], options: { allowFailure: boolean }): void {
  if (!commandExists("launchctl")) {
    if (options.allowFailure) return;
    throw new Error("launchctl is not available.");
  }
  const result = spawnSync("launchctl", args, { encoding: "utf8" });
  if (!options.allowFailure && result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "launchctl failed.");
  }
}

function parseJson(text: string): unknown | null {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function deriveTailnetUrl(status: unknown, serviceName: string): string | null {
  if (!status || typeof status !== "object") return null;
  const record = status as Record<string, unknown>;
  const self = record.Self;
  if (!self || typeof self !== "object") return null;
  const dnsName = (self as Record<string, unknown>).DNSName;
  if (typeof dnsName !== "string" || dnsName.trim() === "") return null;
  const host = dnsName.replace(/\.$/u, "");
  if (serviceName && serviceName !== "scratch-web") {
    return `https://${serviceName}.${host}`;
  }
  return `https://${host}`;
}

async function recentErrors(): Promise<string[]> {
  try {
    const lines = (await readFile(logPath, "utf8")).split(/\r?\n/u).filter(Boolean);
    return lines.filter((line) => /error|failed|exception/i.test(line)).slice(-5);
  } catch {
    return [];
  }
}

async function appendLog(text: string): Promise<void> {
  await ensureLocalDirs();
  await appendFile(logPath, text, { mode: 0o600 });
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function assertPathInside(root: string, candidate: string, message: string): void {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(message);
  }
}

async function assertNoSymlinkInPath(root: string, target: string): Promise<void> {
  const relative = path.relative(path.resolve(root), path.resolve(target));
  const parts = relative.split(path.sep).filter(Boolean);
  let current = path.resolve(root);
  for (const part of parts) {
    current = path.join(current, part);
    try {
      const stats = await lstat(current);
      if (stats.isSymbolicLink()) {
        throw new Error(`Refusing to use symlinked backup/restore path: ${current}`);
      }
    } catch (error: unknown) {
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (code === "ENOENT") return;
      throw error;
    }
  }
}

function formatBackupTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/gu, "-");
}

async function awaitCanWrite(folder: string): Promise<boolean> {
  try {
    await access(folder);
    return true;
  } catch {
    return false;
  }
}

function isICloudDrivePath(folder: string): boolean {
  return folder.includes(`${path.sep}Library${path.sep}Mobile Documents${path.sep}`);
}

function getLoginStartupStatus(config: LocalConfig, launchAgentInstalled: boolean): ServiceStatus["loginStartup"] {
  if (launchAgentInstalled) return "enabled";
  if (config.notesFolder && isICloudDrivePath(config.notesFolder)) return "unsupported_icloud";
  return "not_installed";
}

function loginStartupHelp(status: ServiceStatus): string {
  if (status.loginStartup === "unsupported_icloud") {
    return "iCloud Drive Scratch folders currently use scratch-web start instead of LaunchAgent login startup.";
  }
  return "Run scratch-web launchagent install --yes after confirming.";
}

function printFriendlyStatus(status: ServiceStatus): void {
  console.log("Scratch Web status");
  console.log(`Service installed: ${yesNo(status.serviceInstalled)}`);
  console.log(`Service running:   ${yesNo(status.serviceRunning)}`);
  console.log(`LaunchAgent:       ${status.launchAgentInstalled ? "installed" : status.loginStartup === "unsupported_icloud" ? "disabled for iCloud Drive" : "not installed"}`);
  console.log(`Notes folder:      ${status.notesFolder ?? "not configured"}`);
  console.log(`Local URL:         ${status.localUrl ?? "not available"}`);
  console.log(`Tailnet URL:       ${status.tailnetUrl ?? "not configured yet"}`);
  console.log(`Auth enabled:      ${yesNo(status.authEnabled)}`);
  console.log(`Tailscale:         ${status.tailscaleInstalled ? status.tailscaleVersion ?? "installed" : "not installed"}`);
  console.log(`Tailscale login:   ${yesNo(status.tailscaleLoggedIn)}`);
  console.log(`Tailscale Serve:   ${yesNo(status.tailscaleServeConfigured)}`);
  console.log(`Funnel enabled:    ${yesNo(status.funnelEnabled)}`);
  if (status.recentErrors.length > 0) {
    console.log("Recent errors:");
    for (const error of status.recentErrors) console.log(`- ${error}`);
  }
}

function printCheck(name: string, ok: boolean, help: string): void {
  console.log(`${ok ? "OK " : "NO "} ${name}${ok ? "" : ` - ${help}`}`);
}

function yesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function escapePlist(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
