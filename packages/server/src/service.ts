import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import type { AssetMetadata, GitOperationResult, GitStatus, GitAvailability, Note, NoteMetadata, SaveNoteRequest, SearchResult, Settings } from "@scratch-web/shared";
import { BackupStore } from "./backups.js";
import { ScratchWebError } from "./errors.js";
import { commitGit, fetchGit, getGitAvailability, getGitStatus, initGit, pullGit, pushGit, pushGitUpstream, setGitRemote, syncGit } from "./git.js";
import { extractTitle, extractTitleFromId, generatePreview, sanitizeFilename } from "./markdown.js";
import {
  DEFAULT_IGNORED_DIRS,
  absAssetPath,
  absPathFromId,
  assertNoSymlinkForSensitivePath,
  assertNoSymlinkInPath,
  assertPathInside,
  canonicalizeNotesRoot,
  idFromAbsPath,
  scratchInternalDir,
  settingsPath,
  validateFolderPath,
  validateNoteId
} from "./paths.js";
import { getFileVersion, sha256Text, versionsEqual } from "./version.js";

const DEFAULT_SETTINGS: Settings = {
  theme: { mode: "system" }
};

export interface ScratchBridgeOptions {
  notesRoot: string;
  backupsRoot: string;
}

export class ScratchBridge {
  private notesRoot: string | null = null;
  private readonly backupStore: BackupStore;

  constructor(private readonly options: ScratchBridgeOptions) {
    this.backupStore = new BackupStore({ backupsRoot: options.backupsRoot });
  }

  async initialize(): Promise<void> {
    await this.setNotesFolder(this.options.notesRoot);
  }

  getNotesFolder(): string | null {
    return this.notesRoot;
  }

  async setNotesFolder(folder: string): Promise<string> {
    const root = await canonicalizeNotesRoot(folder);
    await mkdir(path.join(root, "assets"), { recursive: true });
    await mkdir(scratchInternalDir(root), { recursive: true });
    const writeTest = path.join(scratchInternalDir(root), `.write-test-${randomUUID()}`);
    await writeFile(writeTest, "ok", { mode: 0o600 });
    await rm(writeTest, { force: true });
    this.notesRoot = root;
    return root;
  }

  async listNotes(): Promise<NoteMetadata[]> {
    const root = this.requireRoot();
    const ignored = await this.getIgnoredDirs();
    const files = await walkMarkdownFiles(root, ignored);
    const notes = await Promise.all(files.map((file) => this.metadataFromPath(file)));
    const settings = await this.getSettings();
    const pinned = new Set(settings.pinnedNoteIds ?? []);
    return notes.sort((a, b) => {
      const aPinned = pinned.has(a.id);
      const bPinned = pinned.has(b.id);
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }
      return b.modified - a.modified;
    });
  }

  async readNote(id: string): Promise<Note> {
    const root = this.requireRoot();
    const filePath = absPathFromId(root, id);
    await assertNoSymlinkForSensitivePath(filePath);
    const content = await readFile(filePath, "utf8");
    const metadata = await stat(filePath);
    return {
      id,
      title: extractTitle(content),
      content,
      path: filePath,
      modified: Math.floor(metadata.mtimeMs / 1000),
      version: await getFileVersion(filePath)
    };
  }

  async saveNote(request: SaveNoteRequest): Promise<Note> {
    const root = this.requireRoot();
    const title = extractTitle(request.content);
    const sanitizedLeaf = sanitizeFilename(title);
    const target = await this.resolveSaveTarget(root, request.id, sanitizedLeaf);

    if (request.id && target.oldPath) {
      await assertNoSymlinkForSensitivePath(target.oldPath);
    }
    await assertNoSymlinkInPath(root, target.filePath);
    await assertNoSymlinkForSensitivePath(target.filePath);

    if (request.id && target.oldPath) {
      const currentVersion = await getFileVersion(target.oldPath);
      if (!request.expectedVersion) {
        throw new ScratchWebError("VERSION_REQUIRED", "Existing note saves require an expected version token.", 409);
      }
      if (!versionsEqual(currentVersion, request.expectedVersion)) {
        throw new ScratchWebError("CONFLICT", "Note changed on disk since it was loaded.", 409);
      }
      await this.backupStore.backupNote({
        action: "overwrite",
        noteId: request.id,
        originalPath: target.oldPath,
        previousHash: currentVersion.sha256,
        newHash: await sha256Text(request.content)
      });
    }

    await atomicWrite(target.filePath, request.content);

    if (target.oldPath && target.oldPath !== target.filePath) {
      await rm(target.oldPath, { force: true });
      await this.renamePinnedNoteReference(request.id, target.id);
    }

    return this.readNote(target.id);
  }

  async createNote(targetFolder?: string): Promise<Note> {
    const settings = await this.getSettings();
    const template = settings.defaultNoteName ?? "Untitled";
    const baseLeaf = sanitizeFilename(expandNoteNameTemplate(template));
    const prefix = targetFolder && targetFolder !== "" ? `${targetFolder.replace(/\/+$/u, "")}/` : "";
    if (targetFolder && targetFolder !== "") {
      validateFolderPath(targetFolder);
    }
    const root = this.requireRoot();
    let id = `${prefix}${baseLeaf}`;
    let counter = 1;
    while (await exists(absPathFromId(root, id))) {
      id = `${prefix}${baseLeaf}-${counter}`;
      counter += 1;
    }
    const content = `# ${extractTitleFromId(id)}\n\n`;
    const filePath = absPathFromId(root, id);
    await assertNoSymlinkInPath(root, filePath);
    await assertNoSymlinkForSensitivePath(filePath);
    await atomicWrite(filePath, content);
    return this.readNote(id);
  }

  async deleteNote(id: string): Promise<void> {
    const root = this.requireRoot();
    const filePath = absPathFromId(root, id);
    await assertNoSymlinkForSensitivePath(filePath);
    const version = await getFileVersion(filePath);
    await this.backupStore.backupNote({
      action: "delete",
      noteId: id,
      originalPath: filePath,
      previousHash: version.sha256
    });
    await rm(filePath);
  }

  async duplicateNote(id: string): Promise<Note> {
    const original = await this.readNote(id);
    const duplicateContent = original.content.replace(/^# (.+)$/mu, (_match, title: string) => `# ${title} (Copy)`);
    return this.saveNote({ id: null, content: duplicateContent || original.content });
  }

  async listFolders(): Promise<string[]> {
    const root = this.requireRoot();
    const ignored = await this.getIgnoredDirs();
    const folders: string[] = [];
    await walkDirs(root, ignored, folders);
    return folders.sort();
  }

  async createFolder(folderPath: string): Promise<void> {
    const root = this.requireRoot();
    validateFolderPath(folderPath);
    const target = path.resolve(root, folderPath);
    assertPathInside(root, target);
    await assertNoSymlinkInPath(root, target);
    await assertNoSymlinkForSensitivePath(target);
    await mkdir(target, { recursive: true });
  }

  async deleteFolder(folderPath: string): Promise<void> {
    const root = this.requireRoot();
    validateFolderPath(folderPath);
    const target = path.resolve(root, folderPath);
    assertPathInside(root, target);
    await assertNoSymlinkForSensitivePath(target);
    const notesToDelete = await walkMarkdownFiles(root, await this.getIgnoredDirs(), target);
    for (const notePath of notesToDelete) {
      await assertNoSymlinkForSensitivePath(notePath);
      const noteId = idFromAbsPath(root, notePath, await this.getIgnoredDirs());
      if (!noteId) {
        throw new ScratchWebError("INVALID_NOTE_PATH", "Invalid note path.");
      }
      const version = await getFileVersion(notePath);
      await this.backupStore.backupNote({
        action: "delete",
        noteId,
        originalPath: notePath,
        previousHash: version.sha256
      });
    }
    await rm(target, { recursive: true });
  }

  async renameFolder(oldPath: string, newName: string): Promise<void> {
    const root = this.requireRoot();
    validateFolderPath(oldPath);
    const cleanName = sanitizeFilename(newName);
    if (cleanName.includes("/")) {
      throw new ScratchWebError("INVALID_FOLDER_NAME", "Folder name cannot contain slashes.");
    }
    const source = path.resolve(root, oldPath);
    const destination = path.join(path.dirname(source), cleanName);
    assertPathInside(root, source);
    assertPathInside(root, destination);
    await assertNoSymlinkForSensitivePath(source);
    await assertNoSymlinkInPath(root, destination);
    await assertNoSymlinkForSensitivePath(destination);
    if (await exists(destination)) {
      throw new ScratchWebError("FOLDER_EXISTS", "A folder with that name already exists.", 409);
    }
    await rename(source, destination);
  }

  async moveNote(id: string, targetFolder: string): Promise<string> {
    const root = this.requireRoot();
    validateNoteId(id);
    if (targetFolder !== "") {
      validateFolderPath(targetFolder);
    }
    const source = absPathFromId(root, id);
    const leaf = id.split("/").at(-1) ?? id;
    const newId = targetFolder === "" ? leaf : `${targetFolder}/${leaf}`;
    const destination = absPathFromId(root, newId);
    await assertNoSymlinkForSensitivePath(source);
    await assertNoSymlinkInPath(root, destination);
    await assertNoSymlinkForSensitivePath(destination);
    if (await exists(destination)) {
      throw new ScratchWebError("NOTE_EXISTS", "A note with that name already exists.", 409);
    }
    await mkdir(path.dirname(destination), { recursive: true });
    await rename(source, destination);
    return newId;
  }

  async moveFolder(folderPath: string, targetParent: string): Promise<void> {
    const root = this.requireRoot();
    validateFolderPath(folderPath);
    if (targetParent !== "") {
      validateFolderPath(targetParent);
    }
    const source = path.resolve(root, folderPath);
    const name = path.basename(source);
    const destination = targetParent === "" ? path.join(root, name) : path.resolve(root, targetParent, name);
    assertPathInside(root, source);
    assertPathInside(root, destination);
    if (destination.startsWith(`${source}${path.sep}`) || destination === source) {
      throw new ScratchWebError("INVALID_MOVE", "Cannot move a folder into itself.");
    }
    await assertNoSymlinkForSensitivePath(source);
    await assertNoSymlinkInPath(root, destination);
    await assertNoSymlinkForSensitivePath(destination);
    if (await exists(destination)) {
      throw new ScratchWebError("FOLDER_EXISTS", "A folder with that name already exists.", 409);
    }
    await mkdir(path.dirname(destination), { recursive: true });
    await rename(source, destination);
  }

  async getSettings(): Promise<Settings> {
    const root = this.requireRoot();
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(await readFile(settingsPath(root), "utf8")) } as Settings;
    } catch (error: unknown) {
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (code === "ENOENT") {
        return DEFAULT_SETTINGS;
      }
      throw error;
    }
  }

  async updateSettings(settings: Settings): Promise<void> {
    const root = this.requireRoot();
    const current = await this.getSettings();
    const merged = { ...current, ...settings, theme: settings.theme ?? current.theme };
    await mkdir(scratchInternalDir(root), { recursive: true });
    await assertNoSymlinkInPath(root, settingsPath(root));
    await assertNoSymlinkForSensitivePath(settingsPath(root));
    await atomicWrite(settingsPath(root), `${JSON.stringify(merged, null, 2)}\n`);
  }

  async searchNotes(query: string): Promise<SearchResult[]> {
    const trimmed = query.trim().toLocaleLowerCase();
    if (trimmed === "") {
      return [];
    }
    const notes = await this.listNotes();
    const results: SearchResult[] = [];
    for (const note of notes) {
      const full = await this.readNote(note.id);
      const haystack = `${full.title}\n${full.content}`.toLocaleLowerCase();
      if (haystack.includes(trimmed)) {
        results.push({ ...note, score: full.title.toLocaleLowerCase().includes(trimmed) ? 2 : 1 });
      }
    }
    return results.sort((a, b) => b.score - a.score || b.modified - a.modified);
  }

  async listBackups() {
    return this.backupStore.list();
  }

  async getGitAvailability(): Promise<GitAvailability> {
    return getGitAvailability();
  }

  async getGitStatus(): Promise<GitStatus> {
    return getGitStatus(this.requireRoot());
  }

  async initGit(): Promise<GitOperationResult> {
    return initGit(this.requireRoot());
  }

  async commitGit(message: string): Promise<GitOperationResult> {
    return commitGit(this.requireRoot(), message);
  }

  async pushGit(): Promise<GitOperationResult> {
    return pushGit(this.requireRoot());
  }

  async fetchGit(): Promise<GitOperationResult> {
    return fetchGit(this.requireRoot());
  }

  async pullGit(): Promise<GitOperationResult> {
    return pullGit(this.requireRoot());
  }

  async syncGit(): Promise<GitOperationResult> {
    return syncGit(this.requireRoot());
  }

  async setGitRemote(remoteUrl: string): Promise<GitOperationResult> {
    return setGitRemote(this.requireRoot(), remoteUrl);
  }

  async pushGitUpstream(): Promise<GitOperationResult> {
    return pushGitUpstream(this.requireRoot());
  }

  async importAsset(input: { filename: string; mimeType: string; dataBase64: string }): Promise<AssetMetadata> {
    const root = this.requireRoot();
    const mimeType = validateAssetMimeType(input.mimeType);
    const extension = extensionForMimeType(mimeType);
    const safeBase = sanitizeFilename(path.basename(input.filename).replace(/\.[^.]+$/u, "")) || "image";
    const bytes = Buffer.from(input.dataBase64, "base64");
    if (bytes.length === 0) {
      throw new ScratchWebError("INVALID_ASSET", "Asset data cannot be empty.");
    }
    if (bytes.length > 10 * 1024 * 1024) {
      throw new ScratchWebError("ASSET_TOO_LARGE", "Images must be 10MB or smaller.", 413);
    }
    assertImageSignature(bytes, mimeType);
    let assetPath = `${safeBase}.${extension}`;
    let counter = 1;
    while (await exists(absAssetPath(root, assetPath))) {
      assetPath = `${safeBase}-${counter}.${extension}`;
      counter += 1;
    }
    const filePath = absAssetPath(root, assetPath);
    await assertNoSymlinkInPath(root, filePath);
    await assertNoSymlinkForSensitivePath(filePath);
    await atomicWriteBuffer(filePath, bytes);
    return {
      path: `assets/${assetPath}`,
      url: `/api/assets/${encodeURIComponent(assetPath)}`,
      filename: path.basename(assetPath),
      mimeType,
      size: bytes.length
    };
  }

  async readAsset(assetPath: string): Promise<{ bytes: Buffer; metadata: AssetMetadata }> {
    const root = this.requireRoot();
    const filePath = absAssetPath(root, assetPath);
    await assertNoSymlinkForSensitivePath(filePath);
    const bytes = await readFile(filePath);
    const mimeType = mimeTypeForAssetPath(filePath);
    assertImageSignature(bytes, mimeType);
    return {
      bytes,
      metadata: {
        path: `assets/${assetPath.replace(/^assets\//u, "")}`,
        url: `/api/assets/${encodeURIComponent(assetPath.replace(/^assets\//u, ""))}`,
        filename: path.basename(filePath),
        mimeType,
        size: bytes.length
      }
    };
  }

  private async metadataFromPath(filePath: string): Promise<NoteMetadata> {
    const root = this.requireRoot();
    const ignored = await this.getIgnoredDirs();
    const id = idFromAbsPath(root, filePath, ignored);
    if (!id) {
      throw new ScratchWebError("INVALID_NOTE_PATH", "Invalid note path.");
    }
    const [content, metadata, version] = await Promise.all([readFile(filePath, "utf8"), stat(filePath), getFileVersion(filePath)]);
    return {
      id,
      title: extractTitle(content),
      preview: generatePreview(content),
      modified: Math.floor(metadata.mtimeMs / 1000),
      version
    };
  }

  private async getIgnoredDirs(): Promise<readonly string[]> {
    const settings = await this.getSettings();
    return settings.ignoredPatterns ?? DEFAULT_IGNORED_DIRS;
  }

  private requireRoot(): string {
    if (!this.notesRoot) {
      throw new ScratchWebError("NOTES_FOLDER_NOT_SET", "Notes folder is not configured.", 500);
    }
    return this.notesRoot;
  }

  private async resolveSaveTarget(root: string, existingId: string | null, sanitizedLeaf: string): Promise<{ id: string; filePath: string; oldPath?: string }> {
    if (existingId) {
      validateNoteId(existingId);
      const oldPath = absPathFromId(root, existingId);
      const dirPrefix = existingId.includes("/") ? existingId.slice(0, existingId.lastIndexOf("/")) : "";
      let desiredId = dirPrefix === "" ? sanitizedLeaf : `${dirPrefix}/${sanitizedLeaf}`;
      let counter = 1;
      while (desiredId !== existingId && (await exists(absPathFromId(root, desiredId)))) {
        desiredId = dirPrefix === "" ? `${sanitizedLeaf}-${counter}` : `${dirPrefix}/${sanitizedLeaf}-${counter}`;
        counter += 1;
      }
      return { id: desiredId, filePath: absPathFromId(root, desiredId), oldPath };
    }

    let id = sanitizedLeaf;
    let counter = 1;
    while (await exists(absPathFromId(root, id))) {
      id = `${sanitizedLeaf}-${counter}`;
      counter += 1;
    }
    return { id, filePath: absPathFromId(root, id) };
  }

  private async renamePinnedNoteReference(oldId: string | null, newId: string): Promise<void> {
    if (!oldId || oldId === newId) {
      return;
    }
    const settings = await this.getSettings();
    const pinnedIds = settings.pinnedNoteIds ?? [];
    if (!pinnedIds.includes(oldId)) {
      return;
    }
    await this.updateSettings({
      ...settings,
      pinnedNoteIds: pinnedIds.map((id) => (id === oldId ? newId : id))
    });
  }
}

async function atomicWrite(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(tempPath, content, { mode: 0o600 });
  await rename(tempPath, filePath);
}

async function atomicWriteBuffer(filePath: string, content: Buffer): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
  await writeFile(tempPath, content, { mode: 0o600 });
  await rename(tempPath, filePath);
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function walkMarkdownFiles(root: string, ignored: readonly string[], current = root, results: string[] = []): Promise<string[]> {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if ([...DEFAULT_IGNORED_DIRS, ...ignored, ".git", ".scratch", ".obsidian", ".trash", "assets"].includes(entry.name)) {
        continue;
      }
      await walkMarkdownFiles(root, ignored, path.join(current, entry.name), results);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(path.join(current, entry.name));
    }
  }
  return results;
}

async function walkDirs(root: string, ignored: readonly string[], results: string[], current = root): Promise<void> {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }
    if ([...DEFAULT_IGNORED_DIRS, ...ignored, ".git", ".scratch", ".obsidian", ".trash", "assets"].includes(entry.name)) {
      continue;
    }
    const absolute = path.join(current, entry.name);
    results.push(path.relative(root, absolute).split(path.sep).join("/"));
    await walkDirs(root, ignored, results, absolute);
  }
}

function expandNoteNameTemplate(template: string): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return template
    .replaceAll("{timestamp}", String(Math.floor(now.getTime() / 1000)))
    .replaceAll("{date}", `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`)
    .replaceAll("{year}", String(now.getFullYear()))
    .replaceAll("{month}", pad(now.getMonth() + 1))
    .replaceAll("{day}", pad(now.getDate()))
    .replaceAll("{time}", `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`);
}

function validateAssetMimeType(mimeType: string): AssetMetadata["mimeType"] {
  if (mimeType === "image/png" || mimeType === "image/jpeg" || mimeType === "image/gif" || mimeType === "image/webp") {
    return mimeType;
  }
  throw new ScratchWebError("INVALID_ASSET_TYPE", "Only PNG, JPEG, GIF, and WebP images are supported.");
}

function extensionForMimeType(mimeType: AssetMetadata["mimeType"]): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/gif") return "gif";
  return "webp";
}

function mimeTypeForAssetPath(filePath: string): AssetMetadata["mimeType"] {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".gif") return "image/gif";
  if (extension === ".webp") return "image/webp";
  throw new ScratchWebError("INVALID_ASSET_TYPE", "Unsupported asset type.");
}

function assertImageSignature(bytes: Buffer, mimeType: AssetMetadata["mimeType"]): void {
  const matches =
    (mimeType === "image/png" && bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) ||
    (mimeType === "image/jpeg" && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (mimeType === "image/gif" && bytes.length >= 6 && (bytes.subarray(0, 6).toString("ascii") === "GIF87a" || bytes.subarray(0, 6).toString("ascii") === "GIF89a")) ||
    (mimeType === "image/webp" &&
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP");
  if (!matches) {
    throw new ScratchWebError("INVALID_ASSET_DATA", "Image data does not match the declared type.");
  }
}
