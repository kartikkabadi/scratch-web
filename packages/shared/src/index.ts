export * from "./api.js";

export interface NoteMetadata {
  id: string;
  title: string;
  preview: string;
  modified: number;
  version: FileVersion;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  path: string;
  modified: number;
  version: FileVersion;
}

export interface FileVersion {
  mtimeMs: number;
  size: number;
  sha256: string;
}

export interface SaveNoteRequest {
  id: string | null;
  content: string;
  expectedVersion?: FileVersion;
}

export interface SearchResult extends NoteMetadata {
  score: number;
}

export interface BackupManifestEntry {
  timestamp: string;
  action: "overwrite" | "delete";
  noteId: string;
  originalPath: string;
  backupPath: string;
  previousHash: string;
  newHash?: string;
}

export interface FileChangeEvent {
  kind: "created" | "changed" | "deleted" | "renamed";
  path: string;
  changedIds: string[];
}

export type RealtimeEventType =
  | "note.created"
  | "note.changed"
  | "note.deleted"
  | "folder.changed"
  | "settings.changed"
  | "conflict.detected"
  | "service.status.changed"
  | "git.status.changed";

export interface RealtimeEvent {
  type: RealtimeEventType;
  changedIds?: string[];
  path?: string;
  timestamp: string;
}

export interface GitAvailability {
  available: boolean;
  version: string | null;
}

export interface GitStatusEntry {
  path: string;
  index: string;
  workingTree: string;
}

export interface GitStatus {
  available: boolean;
  initialized: boolean;
  branch: string | null;
  upstream: string | null;
  ahead: number;
  behind: number;
  clean: boolean;
  entries: GitStatusEntry[];
}

export interface GitOperationResult {
  ok: boolean;
  status: GitStatus;
  stdout?: string;
}

export interface AssetMetadata {
  path: string;
  url: string;
  filename: string;
  mimeType: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  size: number;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export interface Settings {
  theme: { mode: "light" | "dark" | "system" };
  editorFont?: {
    baseFontFamily?: "system-sans" | "serif" | "monospace";
    baseFontSize?: number;
    boldWeight?: number;
    lineHeight?: number;
  };
  gitEnabled?: boolean;
  foldersEnabled?: boolean;
  pinnedNoteIds?: string[];
  textDirection?: "auto" | "ltr" | "rtl";
  editorWidth?: "narrow" | "normal" | "wide" | "full" | "custom";
  customEditorWidthPx?: number;
  defaultNoteName?: string;
  interfaceZoom?: number;
  ollamaModel?: string;
  ignoredPatterns?: string[];
  customColorsLight?: Record<string, string>;
  customColorsDark?: Record<string, string>;
  saveMode?: "auto" | "manual";
  [key: string]: unknown;
}

export interface ServiceStatus {
  serviceInstalled: boolean;
  serviceRunning: boolean;
  launchAgentInstalled: boolean;
  loginStartup: "enabled" | "not_installed" | "unsupported_icloud";
  notesFolder: string | null;
  localUrl: string | null;
  tailnetUrl: string | null;
  authEnabled: boolean;
  tailscaleInstalled: boolean;
  tailscaleVersion: string | null;
  tailscaleLoggedIn: boolean;
  tailscaleServeConfigured: boolean;
  funnelEnabled: boolean;
  recentErrors: string[];
}
