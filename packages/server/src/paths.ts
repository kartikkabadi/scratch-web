import path from "node:path";
import { mkdir, realpath, lstat } from "node:fs/promises";
import { ScratchWebError } from "./errors.js";

export const EXCLUDED_DIRS = [".git", ".scratch", ".obsidian", ".trash", "assets"] as const;
export const DEFAULT_IGNORED_DIRS: readonly string[] = [
  "node_modules",
  ".next",
  ".nuxt",
  "dist",
  "build",
  "out",
  "target",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  ".cache",
  "coverage",
  ".svn",
  ".hg",
  "bower_components",
  ".turbo",
  ".parcel-cache"
];

export async function canonicalizeNotesRoot(notesRoot: string): Promise<string> {
  await mkdir(notesRoot, { recursive: true });
  return realpath(notesRoot);
}

export function validateNoteId(id: string): void {
  if (id.trim() === "") {
    throw new ScratchWebError("INVALID_NOTE_ID", "Note ID cannot be empty.");
  }
  if (id.includes("\\")) {
    throw new ScratchWebError("INVALID_NOTE_ID", "Backslashes are not allowed in note IDs.");
  }
  if (path.isAbsolute(id)) {
    throw new ScratchWebError("INVALID_NOTE_ID", "Absolute note IDs are not allowed.");
  }
  for (const part of id.split("/")) {
    if (part === "" || part === "." || part === "..") {
      throw new ScratchWebError("INVALID_NOTE_ID", "Path traversal is not allowed in note IDs.");
    }
    if ((EXCLUDED_DIRS as readonly string[]).includes(part)) {
      throw new ScratchWebError("RESERVED_PATH", `'${part}' is reserved.`);
    }
  }
}

export function validateFolderPath(folderPath: string): void {
  validateNoteId(folderPath);
}

export function absPathFromId(notesRoot: string, id: string): string {
  validateNoteId(id);
  const target = path.resolve(notesRoot, `${id}.md`);
  assertPathInside(notesRoot, target);
  return target;
}

export function validateAssetPath(assetPath: string): void {
  if (assetPath.trim() === "") {
    throw new ScratchWebError("INVALID_ASSET_PATH", "Asset path cannot be empty.");
  }
  if (assetPath.includes("\\")) {
    throw new ScratchWebError("INVALID_ASSET_PATH", "Backslashes are not allowed in asset paths.");
  }
  if (path.isAbsolute(assetPath)) {
    throw new ScratchWebError("INVALID_ASSET_PATH", "Absolute asset paths are not allowed.");
  }
  for (const part of assetPath.split("/")) {
    if (part === "" || part === "." || part === "..") {
      throw new ScratchWebError("INVALID_ASSET_PATH", "Path traversal is not allowed in asset paths.");
    }
    if ((EXCLUDED_DIRS as readonly string[]).includes(part) && part !== "assets") {
      throw new ScratchWebError("RESERVED_PATH", `'${part}' is reserved.`);
    }
  }
}

export function absAssetPath(notesRoot: string, assetPath: string): string {
  validateAssetPath(assetPath);
  const normalized = assetPath.startsWith("assets/") ? assetPath.slice("assets/".length) : assetPath;
  validateAssetPath(normalized);
  const target = path.resolve(notesRoot, "assets", normalized);
  assertPathInside(path.resolve(notesRoot, "assets"), target);
  return target;
}

export function idFromAbsPath(notesRoot: string, absolutePath: string, ignoredDirs = DEFAULT_IGNORED_DIRS): string | null {
  const relative = path.relative(notesRoot, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  const parts = relative.split(path.sep);
  for (const part of parts.slice(0, -1)) {
    if ((EXCLUDED_DIRS as readonly string[]).includes(part) || (ignoredDirs as readonly string[]).includes(part)) {
      return null;
    }
  }
  if (!relative.endsWith(".md")) {
    return null;
  }
  const id = relative.slice(0, -3).split(path.sep).join("/");
  return id === "" ? null : id;
}

export function assertPathInside(root: string, target: string): void {
  const relative = path.relative(root, target);
  if (relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))) {
    return;
  }
  throw new ScratchWebError("PATH_ESCAPE", "Path escapes notes folder.");
}

export async function assertNoSymlinkForSensitivePath(target: string): Promise<void> {
  try {
    const metadata = await lstat(target);
    if (metadata.isSymbolicLink()) {
      throw new ScratchWebError("SYMLINK_REJECTED", "Symlink writes, deletes, and moves are rejected in v1.");
    }
  } catch (error: unknown) {
    if (error instanceof ScratchWebError) {
      throw error;
    }
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code !== "ENOENT") {
      throw error;
    }
  }
}

export async function assertNoSymlinkInPath(root: string, target: string): Promise<void> {
  assertPathInside(root, target);
  const relative = path.relative(root, path.dirname(target));
  if (relative === "") {
    return;
  }
  let cursor = root;
  for (const part of relative.split(path.sep)) {
    cursor = path.join(cursor, part);
    await assertNoSymlinkForSensitivePath(cursor);
  }
}

export function settingsPath(notesRoot: string): string {
  return path.join(notesRoot, ".scratch", "settings.json");
}

export function scratchInternalDir(notesRoot: string): string {
  return path.join(notesRoot, ".scratch");
}
