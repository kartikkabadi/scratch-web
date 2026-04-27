import type { FileVersion, SaveNoteRequest, Settings } from "@scratch-web/shared";
import { ScratchWebError } from "./errors.js";

type JsonRecord = Record<string, unknown>;

export async function readJsonBody(request: Request, maxBytes = 1_000_000): Promise<unknown> {
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new ScratchWebError("REQUEST_TOO_LARGE", "Request body is too large.", 413);
  }
  if (text.trim() === "") {
    return {};
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ScratchWebError("INVALID_JSON", "Request body must be valid JSON.");
  }
}

export function asRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ScratchWebError("INVALID_BODY", "Request body must be an object.");
  }
  return value as JsonRecord;
}

export function readString(record: JsonRecord, key: string, options: { optional?: boolean } = {}): string {
  const value = record[key];
  if (value === undefined && options.optional) {
    return "";
  }
  if (typeof value !== "string") {
    throw new ScratchWebError("INVALID_FIELD", `'${key}' must be a string.`);
  }
  return value;
}

export function readOptionalString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new ScratchWebError("INVALID_FIELD", `'${key}' must be a string.`);
  }
  return value;
}

export function parseFileVersion(value: unknown): FileVersion | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const record = asRecord(value);
  if (typeof record.mtimeMs !== "number" || typeof record.size !== "number" || typeof record.sha256 !== "string") {
    throw new ScratchWebError("INVALID_VERSION", "File version must contain mtimeMs, size, and sha256.");
  }
  return {
    mtimeMs: record.mtimeMs,
    size: record.size,
    sha256: record.sha256
  };
}

export function parseSaveNoteRequest(value: unknown, idFromPath: string | null): SaveNoteRequest {
  const record = asRecord(value);
  const content = readString(record, "content");
  const bodyId = readOptionalString(record, "id");
  const request: SaveNoteRequest = {
    id: idFromPath ?? bodyId ?? null,
    content
  };
  const expectedVersion = parseFileVersion(record.expectedVersion);
  if (expectedVersion) {
    request.expectedVersion = expectedVersion;
  }
  return request;
}

export function parseSettings(value: unknown): Settings {
  const record = asRecord(value);
  const parsed: Settings = { ...record, theme: { mode: "system" } };

  if (record.theme !== undefined) {
    const theme = asRecord(record.theme);
    rejectUnknownKeys(theme, ["mode"]);
    if (!theme.mode) {
      throw new ScratchWebError("INVALID_SETTINGS", "Settings theme must include a mode.");
    }
    const mode = theme.mode;
    if (mode !== "light" && mode !== "dark" && mode !== "system") {
      throw new ScratchWebError("INVALID_SETTINGS", "Theme mode must be light, dark, or system.");
    }
    parsed.theme = { mode };
  }

  if (record.editorFont !== undefined) {
    const editorFont = asRecord(record.editorFont);
    rejectUnknownKeys(editorFont, ["baseFontFamily", "baseFontSize", "boldWeight", "lineHeight"]);
    parsed.editorFont = {};
    if (editorFont.baseFontFamily !== undefined) {
      if (editorFont.baseFontFamily !== "system-sans" && editorFont.baseFontFamily !== "serif" && editorFont.baseFontFamily !== "monospace") {
        throw new ScratchWebError("INVALID_SETTINGS", "Editor font family is invalid.");
      }
      parsed.editorFont.baseFontFamily = editorFont.baseFontFamily;
    }
    if (editorFont.baseFontSize !== undefined) parsed.editorFont.baseFontSize = readNumber(editorFont, "baseFontSize", 8, 48);
    if (editorFont.boldWeight !== undefined) parsed.editorFont.boldWeight = readNumber(editorFont, "boldWeight", 100, 1000);
    if (editorFont.lineHeight !== undefined) parsed.editorFont.lineHeight = readNumber(editorFont, "lineHeight", 1, 3);
  }
  if (record.gitEnabled !== undefined) parsed.gitEnabled = readBoolean(record, "gitEnabled");
  if (record.foldersEnabled !== undefined) parsed.foldersEnabled = readBoolean(record, "foldersEnabled");
  if (record.pinnedNoteIds !== undefined) parsed.pinnedNoteIds = readStringArray(record, "pinnedNoteIds");
  if (record.textDirection !== undefined) {
    if (record.textDirection !== "auto" && record.textDirection !== "ltr" && record.textDirection !== "rtl") {
      throw new ScratchWebError("INVALID_SETTINGS", "Text direction is invalid.");
    }
    parsed.textDirection = record.textDirection;
  }
  if (record.editorWidth !== undefined) {
    if (
      record.editorWidth !== "narrow" &&
      record.editorWidth !== "normal" &&
      record.editorWidth !== "wide" &&
      record.editorWidth !== "full" &&
      record.editorWidth !== "custom"
    ) {
      throw new ScratchWebError("INVALID_SETTINGS", "Editor width is invalid.");
    }
    parsed.editorWidth = record.editorWidth;
  }
  if (record.customEditorWidthPx !== undefined) parsed.customEditorWidthPx = readNumber(record, "customEditorWidthPx", 240, 2400);
  if (record.defaultNoteName !== undefined) parsed.defaultNoteName = readString(record, "defaultNoteName");
  if (record.interfaceZoom !== undefined) parsed.interfaceZoom = readNumber(record, "interfaceZoom", 50, 200);
  if (record.ollamaModel !== undefined) parsed.ollamaModel = readString(record, "ollamaModel");
  if (record.ignoredPatterns !== undefined) parsed.ignoredPatterns = readStringArray(record, "ignoredPatterns");
  if (record.customColorsLight !== undefined) parsed.customColorsLight = readStringRecord(record, "customColorsLight");
  if (record.customColorsDark !== undefined) parsed.customColorsDark = readStringRecord(record, "customColorsDark");
  if (record.saveMode !== undefined) {
    if (record.saveMode !== "auto" && record.saveMode !== "manual") {
      throw new ScratchWebError("INVALID_SETTINGS", "Save mode must be auto or manual.");
    }
    parsed.saveMode = record.saveMode;
  }
  return parsed;
}

function rejectUnknownKeys(record: JsonRecord, allowedKeys: readonly string[]): void {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new ScratchWebError("UNKNOWN_FIELD", `'${key}' is not a supported field.`);
    }
  }
}

function readBoolean(record: JsonRecord, key: string): boolean {
  const value = record[key];
  if (typeof value !== "boolean") {
    throw new ScratchWebError("INVALID_FIELD", `'${key}' must be a boolean.`);
  }
  return value;
}

function readNumber(record: JsonRecord, key: string, min: number, max: number): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new ScratchWebError("INVALID_FIELD", `'${key}' must be a number between ${min} and ${max}.`);
  }
  return value;
}

function readStringArray(record: JsonRecord, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new ScratchWebError("INVALID_FIELD", `'${key}' must be an array of strings.`);
  }
  return value;
}

function readStringRecord(record: JsonRecord, key: string): Record<string, string> {
  const value = asRecord(record[key]);
  for (const [recordKey, recordValue] of Object.entries(value)) {
    if (typeof recordValue !== "string") {
      throw new ScratchWebError("INVALID_FIELD", `'${key}.${recordKey}' must be a string.`);
    }
  }
  return value as Record<string, string>;
}
