import { createHash } from "node:crypto";
import { stat, readFile } from "node:fs/promises";
import type { FileVersion } from "@scratch-web/shared";

export async function sha256Text(content: string): Promise<string> {
  return createHash("sha256").update(content).digest("hex");
}

export async function getFileVersion(path: string): Promise<FileVersion> {
  const [metadata, content] = await Promise.all([stat(path), readFile(path)]);
  return {
    mtimeMs: metadata.mtimeMs,
    size: metadata.size,
    sha256: createHash("sha256").update(content).digest("hex")
  };
}

export function versionsEqual(left: FileVersion, right: FileVersion): boolean {
  return left.mtimeMs === right.mtimeMs && left.size === right.size && left.sha256 === right.sha256;
}

