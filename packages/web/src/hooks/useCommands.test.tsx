import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { NoteMetadata } from "@scratch-web/shared";
import { useCommands } from "./useCommands";

const mocks = vi.hoisted(() => ({
  createFolder: vi.fn(),
  selectNote: vi.fn(),
  setError: vi.fn(),
  initGit: vi.fn(),
  commitGit: vi.fn(),
  pushGit: vi.fn(),
  fetchGit: vi.fn(),
  pullGit: vi.fn(),
  syncGit: vi.fn(),
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
    setError: mocks.setError,
  }),
}));

vi.mock("../services/api", () => ({
  getGitStatus: vi.fn(),
  initGit: mocks.initGit,
  commitGit: mocks.commitGit,
  pushGit: mocks.pushGit,
  fetchGit: mocks.fetchGit,
  pullGit: mocks.pullGit,
  syncGit: mocks.syncGit,
}));

describe("useCommands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("asks before pushing through the command palette", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false);
    const { result } = renderHook(() =>
      useCommands({
        onToggleSourceMode: vi.fn(),
        onToggleFocusMode: vi.fn(),
        onOpenFind: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.find((command) => command.id === "git-push")?.execute();
    });

    expect(confirm).toHaveBeenCalledWith("Push commits to the configured Git remote?");
    expect(mocks.pushGit).not.toHaveBeenCalled();
  });

  it("asks before committing through the command palette", async () => {
    vi.spyOn(window, "prompt").mockReturnValueOnce(" Release prep ");
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(true);
    const { result } = renderHook(() =>
      useCommands({
        onToggleSourceMode: vi.fn(),
        onToggleFocusMode: vi.fn(),
        onOpenFind: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.find((command) => command.id === "git-commit")?.execute();
    });

    expect(confirm).toHaveBeenCalledWith('Commit all note changes with message "Release prep"?');
    expect(mocks.commitGit).toHaveBeenCalledWith("Release prep");
    expect(mocks.setError).toHaveBeenCalledWith("Committed");
  });
});
