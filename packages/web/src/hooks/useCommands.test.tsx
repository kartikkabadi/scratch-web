import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { NoteMetadata } from "@scratch-web/shared";
import { useCommands } from "./useCommands";

const mocks = vi.hoisted(() => ({
  createFolder: vi.fn(),
  selectNote: vi.fn(),
}));

function note(index: number): NoteMetadata {
  return {
    id: `note-${index}`,
    title: `Note ${index}`,
    preview: "",
    modified: index,
    version: { mtimeMs: index, size: 1, sha256: `hash-${index}` },
  };
}

const notes = Array.from({ length: 25 }, (_value, index) => note(index));

vi.mock("../context/AppContext", () => ({
  useAppData: () => ({
    notes,
    currentNote: null,
    selectedNoteId: null,
    settings: { theme: { mode: "system" }, pinnedNoteIds: [] },
  }),
  useAppActions: () => ({
    createNote: vi.fn(),
    createFolder: mocks.createFolder,
    deleteNote: vi.fn(),
    duplicateNote: vi.fn(),
    pinNote: vi.fn(),
    unpinNote: vi.fn(),
    reloadCurrentNote: vi.fn(),
    selectNote: mocks.selectNote,
    setView: vi.fn(),
    updateSettings: vi.fn(),
    setError: vi.fn(),
  }),
}));

vi.mock("../services/api", () => ({
  getGitStatus: vi.fn(),
  initGit: vi.fn(),
  commitGit: vi.fn(),
  pushGit: vi.fn(),
  fetchGit: vi.fn(),
  pullGit: vi.fn(),
  syncGit: vi.fn(),
}));

describe("useCommands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("includes every note in command palette targets", () => {
    const { result } = renderHook(() =>
      useCommands({
        onToggleSourceMode: vi.fn(),
        onToggleFocusMode: vi.fn(),
        onOpenFind: vi.fn(),
      }),
    );

    const lateNote = result.current.find((command) => command.id === "note:note-24");
    expect(lateNote).toBeDefined();

    act(() => {
      lateNote?.execute();
    });

    expect(mocks.selectNote).toHaveBeenCalledWith("note-24");
  });

  it("creates a root folder from the New Folder command", () => {
    vi.spyOn(window, "prompt").mockReturnValueOnce(" Mobile Ideas ");
    const { result } = renderHook(() =>
      useCommands({
        onToggleSourceMode: vi.fn(),
        onToggleFocusMode: vi.fn(),
        onOpenFind: vi.fn(),
      }),
    );

    act(() => {
      result.current.find((command) => command.id === "new-folder")?.execute();
    });

    expect(mocks.createFolder).toHaveBeenCalledWith("", "Mobile Ideas");
  });
});
