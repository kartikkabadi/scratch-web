import type {
  Note,
  NoteMetadata,
  SearchResult,
  Settings,
  GitAvailability,
  GitOperationResult,
  GitStatus,
  AssetMetadata,
} from "@scratch-web/shared";

const API_BASE = "";

async function api<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {};
  const isMutation = method !== "GET" && method !== "HEAD";
  if (isMutation) {
    headers["content-type"] = "application/json";
  }
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const err = (await response.json().catch(() => ({}))) as {
      error?: { code: string; message: string };
    };
    const error = new Error(
      err.error?.message || `HTTP ${response.status}`,
    ) as Error & { code?: string; status?: number };
    error.code = err.error?.code;
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as T;
}

export async function getNotesFolder(): Promise<{ path: string | null }> {
  return api("GET", "/api/notes-folder");
}

export async function listNotes(): Promise<NoteMetadata[]> {
  return api("GET", "/api/notes");
}

export async function readNote(id: string): Promise<Note> {
  return api("GET", `/api/notes/${encodeURIComponent(id)}`);
}

export async function createNote(
  targetFolder?: string,
): Promise<Note> {
  return api("POST", "/api/notes", { targetFolder });
}

export async function saveNote(
  id: string,
  content: string,
  expectedVersion?: { mtimeMs: number; size: number; sha256: string },
): Promise<Note> {
  return api("PUT", `/api/notes/${encodeURIComponent(id)}`, {
    content,
    expectedVersion,
  });
}

export async function deleteNote(id: string): Promise<void> {
  return api("DELETE", `/api/notes/${encodeURIComponent(id)}`);
}

export async function duplicateNote(id: string): Promise<Note> {
  return api("POST", `/api/notes/${encodeURIComponent(id)}/duplicate`);
}

export async function moveNote(
  id: string,
  targetFolder: string,
): Promise<{ id: string }> {
  return api("PATCH", `/api/notes/${encodeURIComponent(id)}/move`, {
    targetFolder,
  });
}

export async function listFolders(): Promise<string[]> {
  return api("GET", "/api/folders");
}

export async function createFolder(path: string): Promise<void> {
  return api("POST", "/api/folders", { path });
}

export async function deleteFolder(path: string): Promise<void> {
  return api("DELETE", `/api/folders/${encodeURIComponent(path)}`);
}

export async function renameFolder(
  oldPath: string,
  newName: string,
): Promise<void> {
  return api(
    "PATCH",
    `/api/folders/${encodeURIComponent(oldPath)}/rename`,
    { newName },
  );
}

export async function moveFolder(
  path: string,
  targetParent: string,
): Promise<void> {
  return api(
    "PATCH",
    `/api/folders/${encodeURIComponent(path)}/move`,
    { targetParent },
  );
}

export async function getSettings(): Promise<Settings> {
  return api("GET", "/api/settings");
}

export async function updateSettings(settings: Settings): Promise<void> {
  return api("PUT", "/api/settings", settings);
}

export async function searchNotes(query: string): Promise<SearchResult[]> {
  return api("GET", `/api/search?q=${encodeURIComponent(query)}`);
}

export async function getGitAvailability(): Promise<GitAvailability> {
  return api("GET", "/api/git/available");
}

export async function getGitStatus(): Promise<GitStatus> {
  return api("GET", "/api/git/status");
}

export async function initGit(): Promise<GitOperationResult> {
  return api("POST", "/api/git/init");
}

export async function commitGit(message: string): Promise<GitOperationResult> {
  return api("POST", "/api/git/commit", { message });
}

export async function pushGit(): Promise<GitOperationResult> {
  return api("POST", "/api/git/push");
}

export async function fetchGit(): Promise<GitOperationResult> {
  return api("POST", "/api/git/fetch");
}

export async function pullGit(): Promise<GitOperationResult> {
  return api("POST", "/api/git/pull");
}

export async function syncGit(): Promise<GitOperationResult> {
  return api("POST", "/api/git/sync");
}

export async function setGitRemote(url: string): Promise<GitOperationResult> {
  return api("POST", "/api/git/remote", { url });
}

export async function pushGitUpstream(): Promise<GitOperationResult> {
  return api("POST", "/api/git/push-upstream");
}

export async function importAsset(input: {
  filename: string;
  mimeType: string;
  dataBase64: string;
}): Promise<AssetMetadata> {
  return api("POST", "/api/assets/import", input);
}

export function assetUrl(path: string): string {
  const normalized = path.replace(/^assets\//, "");
  return `/api/assets/${encodeURIComponent(normalized)}`;
}

export async function checkHealth(): Promise<{ ok: boolean }> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) return { ok: false };
  return response.json() as Promise<{ ok: boolean }>;
}
