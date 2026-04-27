import { SCRATCH_COMPATIBLE_OPERATIONS } from "@scratch-web/shared";
export { BackupStore } from "./backups.js";
export { ScratchWebError } from "./errors.js";
export { createScratchHttpServer } from "./http.js";
export { extractTitle, generatePreview, sanitizeFilename } from "./markdown.js";
export { absPathFromId, idFromAbsPath, validateNoteId } from "./paths.js";
export { ScratchBridge } from "./service.js";
export { getFileVersion, versionsEqual } from "./version.js";
export { startFileWatcher } from "./watcher.js";

export const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_PORT = 47832;

export interface ServerConfig {
  host: string;
  port: number;
  notesFolder: string | null;
}

export function createDefaultServerConfig(): ServerConfig {
  return {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    notesFolder: null
  };
}

export function assertSafeBindHost(host: string): void {
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error("Scratch Web must bind to localhost by default.");
  }
}

export function listPlannedScratchOperations(): readonly string[] {
  return SCRATCH_COMPATIBLE_OPERATIONS;
}
