import { watch, type FSWatcher } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { FileChangeEvent } from "@scratch-web/shared";
import { idFromAbsPath } from "./paths.js";

export function startFileWatcher(
  notesRoot: string,
  onChange: (event: FileChangeEvent) => void,
  ignoredDirs: readonly string[] = []
): FSWatcher {
  return watch(notesRoot, { recursive: true }, (eventType, filename) => {
    if (!filename) {
      return;
    }
    const absolutePath = path.join(notesRoot, filename.toString());
    const id = idFromAbsPath(notesRoot, absolutePath, ignoredDirs);
    if (!id) {
      return;
    }
    void classifyFileEvent(eventType, absolutePath).then((kind) => onChange({
      kind,
      path: absolutePath,
      changedIds: [id]
    }));
  });
}

async function classifyFileEvent(eventType: string, absolutePath: string): Promise<FileChangeEvent["kind"]> {
  if (eventType !== "rename") {
    return "changed";
  }
  try {
    await stat(absolutePath);
    return "created";
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code === "ENOENT") {
      return "deleted";
    }
    return "renamed";
  }
}
