import path from "node:path";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import type { BackupManifestEntry } from "@scratch-web/shared";

export interface BackupStoreOptions {
  backupsRoot: string;
}

export class BackupStore {
  readonly manifestPath: string;

  constructor(private readonly options: BackupStoreOptions) {
    this.manifestPath = path.join(options.backupsRoot, "manifest.jsonl");
  }

  async backupNote(params: {
    action: BackupManifestEntry["action"];
    noteId: string;
    originalPath: string;
    previousHash: string;
    newHash?: string;
  }): Promise<BackupManifestEntry> {
    const timestamp = new Date().toISOString();
    const day = timestamp.slice(0, 10);
    const safeId = params.noteId.split("/").map(encodeURIComponent).join(path.sep);
    const backupPath = path.join(this.options.backupsRoot, day, `${safeId}.md`);
    await mkdir(path.dirname(backupPath), { recursive: true, mode: 0o700 });
    await copyFile(params.originalPath, backupPath);

    const entry: BackupManifestEntry = {
      timestamp,
      action: params.action,
      noteId: params.noteId,
      originalPath: params.originalPath,
      backupPath,
      previousHash: params.previousHash,
      ...(params.newHash ? { newHash: params.newHash } : {})
    };
    await this.appendManifest(entry);
    return entry;
  }

  async appendManifest(entry: BackupManifestEntry): Promise<void> {
    await mkdir(this.options.backupsRoot, { recursive: true, mode: 0o700 });
    await writeFile(this.manifestPath, `${JSON.stringify(entry)}\n`, { flag: "a", mode: 0o600 });
  }

  async list(): Promise<BackupManifestEntry[]> {
    try {
      const content = await readFile(this.manifestPath, "utf8");
      return content
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as BackupManifestEntry);
    } catch (error: unknown) {
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }
}

