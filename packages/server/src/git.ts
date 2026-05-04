import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitAvailability, GitOperationResult, GitStatus, GitStatusEntry } from "@scratch-web/shared";
import { ScratchWebError } from "./errors.js";

const execFileAsync = promisify(execFile);

export async function getGitAvailability(): Promise<GitAvailability> {
  try {
    const { stdout } = await execFileAsync("git", ["--version"], { timeout: 5_000 });
    return { available: true, version: stdout.trim() || null };
  } catch {
    return { available: false, version: null };
  }
}

export async function getGitStatus(cwd: string): Promise<GitStatus> {
  const availability = await getGitAvailability();
  if (!availability.available) {
    return emptyStatus(false);
  }
  const initialized = await isGitRepository(cwd);
  if (!initialized) {
    return emptyStatus(true);
  }

  const [branch, upstream, counts, porcelain] = await Promise.all([
    runGit(cwd, ["branch", "--show-current"]).then((out) => out.trim() || null),
    runGit(cwd, ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]).then((out) => out.trim() || null).catch(() => null),
    readAheadBehind(cwd),
    runGit(cwd, ["status", "--porcelain=v1", "-z"])
  ]);
  const entries = parsePorcelain(porcelain);
  return {
    available: true,
    initialized: true,
    branch,
    upstream,
    ahead: counts.ahead,
    behind: counts.behind,
    clean: entries.length === 0,
    entries
  };
}

export async function initGit(cwd: string): Promise<GitOperationResult> {
  const stdout = await runGit(cwd, ["init"]);
  return { ok: true, stdout, status: await getGitStatus(cwd) };
}

export async function commitGit(cwd: string, message: string): Promise<GitOperationResult> {
  const trimmed = message.trim();
  if (trimmed === "") {
    throw new ScratchWebError("INVALID_GIT_MESSAGE", "Git commit message cannot be empty.");
  }
  await ensureInitialized(cwd);
  await runGit(cwd, ["add", "--", "."]);
  const stdout = await runGit(cwd, ["commit", "-m", trimmed]).catch((error: unknown) => {
    if (error instanceof ScratchWebError && /nothing to commit|no changes added/iu.test(error.message)) {
      throw new ScratchWebError("GIT_NOTHING_TO_COMMIT", "There are no note changes to commit.", 409);
    }
    throw error;
  });
  return { ok: true, stdout, status: await getGitStatus(cwd) };
}

export async function pushGit(cwd: string): Promise<GitOperationResult> {
  await ensureInitialized(cwd);
  const stdout = await runGit(cwd, ["push"]);
  return { ok: true, stdout, status: await getGitStatus(cwd) };
}

export async function fetchGit(cwd: string): Promise<GitOperationResult> {
  await ensureInitialized(cwd);
  const stdout = await runGit(cwd, ["fetch"]);
  return { ok: true, stdout, status: await getGitStatus(cwd) };
}

export async function pullGit(cwd: string): Promise<GitOperationResult> {
  await ensureInitialized(cwd);
  const stdout = await runGit(cwd, ["pull", "--ff-only"]);
  return { ok: true, stdout, status: await getGitStatus(cwd) };
}

export async function syncGit(cwd: string): Promise<GitOperationResult> {
  await ensureInitialized(cwd);
  const fetchOut = await runGit(cwd, ["fetch"]);
  const pullOut = await runGit(cwd, ["pull", "--ff-only"]);
  const pushOut = await runGit(cwd, ["push"]);
  return { ok: true, stdout: `${fetchOut}${pullOut}${pushOut}`, status: await getGitStatus(cwd) };
}

export async function setGitRemote(cwd: string, remoteUrl: string): Promise<GitOperationResult> {
  validateRemoteUrl(remoteUrl);
  await ensureInitialized(cwd);
  const hasOrigin = await runGit(cwd, ["remote", "get-url", "origin"]).then(() => true).catch(() => false);
  const stdout = hasOrigin
    ? await runGit(cwd, ["remote", "set-url", "origin", remoteUrl])
    : await runGit(cwd, ["remote", "add", "origin", remoteUrl]);
  return { ok: true, stdout, status: await getGitStatus(cwd) };
}

export async function pushGitUpstream(cwd: string): Promise<GitOperationResult> {
  await ensureInitialized(cwd);
  const branch = await runGit(cwd, ["branch", "--show-current"]).then((out) => out.trim());
  if (!branch) {
    throw new ScratchWebError("GIT_BRANCH_REQUIRED", "Cannot push upstream without a current branch.");
  }
  const stdout = await runGit(cwd, ["push", "-u", "origin", branch]);
  return { ok: true, stdout, status: await getGitStatus(cwd) };
}

async function ensureInitialized(cwd: string): Promise<void> {
  if (!(await isGitRepository(cwd))) {
    throw new ScratchWebError("GIT_NOT_INITIALIZED", "Notes folder is not a Git repository.", 409);
  }
}

async function isGitRepository(cwd: string): Promise<boolean> {
  return runGit(cwd, ["rev-parse", "--is-inside-work-tree"]).then((out) => out.trim() === "true").catch(() => false);
}

async function readAheadBehind(cwd: string): Promise<{ ahead: number; behind: number }> {
  const output = await runGit(cwd, ["rev-list", "--left-right", "--count", "HEAD...@{u}"]).catch(() => "");
  const [aheadRaw, behindRaw] = output.trim().split(/\s+/u);
  return {
    ahead: Number.parseInt(aheadRaw ?? "0", 10) || 0,
    behind: Number.parseInt(behindRaw ?? "0", 10) || 0
  };
}

function parsePorcelain(output: string): GitStatusEntry[] {
  return output
    .split("\0")
    .filter(Boolean)
    .map((entry) => ({
      index: entry.slice(0, 1),
      workingTree: entry.slice(1, 2),
      path: entry.slice(3)
    }));
}

async function runGit(cwd: string, args: readonly string[]): Promise<string> {
  const availability = await getGitAvailability();
  if (!availability.available) {
    throw new ScratchWebError("GIT_UNAVAILABLE", "Git is not installed or not on PATH.", 503);
  }
  try {
    const { stdout, stderr } = await execFileAsync("git", [...args], {
      cwd,
      timeout: 30_000,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" }
    });
    return `${stdout}${stderr}`;
  } catch (error: unknown) {
    const maybe = error as { stderr?: string; stdout?: string; message?: string };
    const message = `${maybe.stderr ?? ""}${maybe.stdout ?? ""}${maybe.message ?? ""}`.trim() || "Git command failed.";
    throw new ScratchWebError("GIT_FAILED", message, 500);
  }
}

function emptyStatus(available: boolean): GitStatus {
  return {
    available,
    initialized: false,
    branch: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    clean: true,
    entries: []
  };
}

function validateRemoteUrl(remoteUrl: string): void {
  const trimmed = remoteUrl.trim();
  if (trimmed === "") {
    throw new ScratchWebError("INVALID_GIT_REMOTE", "Git remote URL cannot be empty.");
  }
  if (/[\n\r\0]/u.test(trimmed)) {
    throw new ScratchWebError("INVALID_GIT_REMOTE", "Git remote URL contains invalid characters.");
  }
  if (/^https?:\/\//iu.test(trimmed)) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new ScratchWebError("INVALID_GIT_REMOTE", "Git remote URL is invalid.");
    }
    if (parsed.username || parsed.password) {
      throw new ScratchWebError("INVALID_GIT_REMOTE", "Git remote URL must not contain embedded credentials.");
    }
  }
  if (!/^(https:\/\/|ssh:\/\/|git@)[^\s]+$/u.test(trimmed)) {
    throw new ScratchWebError("INVALID_GIT_REMOTE", "Git remote must be an HTTPS or SSH URL.");
  }
}
