import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { AppProvider, useAppData, useAppActions } from "./AppContext";
import type { NoteMetadata, Note, Settings } from "@scratch-web/shared";
import * as api from "../services/api";

const mockNotes: NoteMetadata[] = [
  { id: "a", title: "A", preview: "", modified: 1, version: { mtimeMs: 1, size: 1, sha256: "a" } },
  { id: "b", title: "B", preview: "", modified: 2, version: { mtimeMs: 2, size: 1, sha256: "b" } },
];

const mockNote: Note = {
  id: "a",
  title: "A",
  content: "# A\n\nHello",
  path: "/tmp/a.md",
  modified: 1,
  version: { mtimeMs: 1, size: 10, sha256: "h" },
};

const mockSettings: Settings = {
  theme: { mode: "system" },
  foldersEnabled: true,
};

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    getNotesFolder: vi.fn(() => Promise.resolve({ path: "/tmp/notes" })),
    listNotes: vi.fn(() => Promise.resolve(mockNotes)),
    listFolders: vi.fn(() => Promise.resolve(["Projects"])),
    readNote: vi.fn(() => Promise.resolve(mockNote)),
    getSettings: vi.fn(() => Promise.resolve(mockSettings)),
    checkHealth: vi.fn(() => Promise.resolve({ ok: true })),
    saveNote: vi.fn(() => Promise.resolve(mockNote)),
    createNote: vi.fn(() => Promise.resolve(mockNote)),
    deleteNote: vi.fn(() => Promise.resolve()),
    updateSettings: vi.fn(() => Promise.resolve()),
    searchNotes: vi.fn(() => Promise.resolve([])),
  };
});

describe("AppContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes and loads notes", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppProvider>{children}</AppProvider>
    );
    const { result } = renderHook(() => ({ data: useAppData(), actions: useAppActions() }), { wrapper });

    await waitFor(() => expect(result.current.data.isLoading).toBe(false));
    expect(result.current.data.notes).toHaveLength(2);
    expect(result.current.data.folders).toEqual(["Projects"]);
    expect(result.current.data.notesFolder).toBe("/tmp/notes");
  });

  it("selects a note", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppProvider>{children}</AppProvider>
    );
    const { result } = renderHook(() => ({ data: useAppData(), actions: useAppActions() }), { wrapper });

    await waitFor(() => expect(result.current.data.isLoading).toBe(false));

    act(() => {
      result.current.actions.selectNote("a");
    });

    await waitFor(() => expect(result.current.data.currentNote?.id).toBe("a"));
    expect(result.current.data.selectedNoteId).toBe("a");
  });

  it("sets conflict state when save receives a 409", async () => {
    const conflict = Object.assign(new Error("Changed"), { status: 409 });
    vi.mocked(api.saveNote).mockRejectedValueOnce(conflict);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppProvider>{children}</AppProvider>
    );
    const { result } = renderHook(() => ({ data: useAppData(), actions: useAppActions() }), { wrapper });

    await waitFor(() => expect(result.current.data.isLoading).toBe(false));
    await act(async () => {
      await result.current.actions.selectNote("a");
    });
    await act(async () => {
      await result.current.actions.saveNote("# A\n\nChanged");
    });

    expect(result.current.data.hasExternalChanges).toBe(true);
    expect(result.current.data.error).toBe("Changed");
  });

  it("stores search results and clears search state", async () => {
    vi.mocked(api.searchNotes).mockResolvedValueOnce([
      { ...mockNotes[0], score: 2 },
    ]);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AppProvider>{children}</AppProvider>
    );
    const { result } = renderHook(() => ({ data: useAppData(), actions: useAppActions() }), { wrapper });

    await waitFor(() => expect(result.current.data.isLoading).toBe(false));
    await act(async () => {
      await result.current.actions.search("hello");
    });

    expect(result.current.data.searchQuery).toBe("hello");
    expect(result.current.data.searchResults).toHaveLength(1);

    act(() => {
      result.current.actions.clearSearch();
    });
    expect(result.current.data.searchQuery).toBe("");
    expect(result.current.data.searchResults).toHaveLength(0);
  });
});
