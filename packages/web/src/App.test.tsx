import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi, beforeEach } from "vitest";
import App from "./App";
import type { NoteMetadata, Settings } from "@scratch-web/shared";
import * as api from "./services/api";

const mockNotes: NoteMetadata[] = [
  {
    id: "a",
    title: "A",
    preview: "",
    modified: 1,
    version: { mtimeMs: 1, size: 1, sha256: "a" },
  },
];

const mockSettings: Settings = {
  theme: { mode: "dark" },
  foldersEnabled: true,
};

vi.mock("./services/api", () => ({
  getNotesFolder: vi.fn(() => Promise.resolve({ path: "/tmp/notes" })),
  listNotes: vi.fn(() => Promise.resolve(mockNotes)),
  listFolders: vi.fn(() => Promise.resolve([])),
  readNote: vi.fn(() =>
    Promise.resolve({
      id: "a",
      title: "A",
      content: "# A",
      path: "/tmp/a.md",
      modified: 1,
      version: { mtimeMs: 1, size: 1, sha256: "a" },
    }),
  ),
  getSettings: vi.fn(() => Promise.resolve(mockSettings)),
  checkHealth: vi.fn(() => Promise.resolve({ ok: true })),
  saveNote: vi.fn(),
  createNote: vi.fn(),
  deleteNote: vi.fn(),
  updateSettings: vi.fn(),
  searchNotes: vi.fn(),
  importAsset: vi.fn(),
}));

describe("App", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove("dark", "light");
  });

  it("applies the configured dark theme", async () => {
    render(<App />);

    await waitFor(() => expect(screen.queryByText("Initializing Scratch...")).not.toBeInTheDocument());
    await waitFor(() =>
      expect(document.documentElement.classList.contains("dark")).toBe(true),
    );
  });

  it("opens an existing note and closes the sidebar", async () => {
    render(<App />);

    await waitFor(() => expect(screen.queryByText("Initializing Scratch...")).not.toBeInTheDocument());
    const sidebar = document.querySelector(".scratch-sidebar") as HTMLElement;
    expect(sidebar.classList.contains("sb-sidebar-open")).toBe(true);

    fireEvent.click(screen.getByText("A"));

    await waitFor(() => expect(api.readNote).toHaveBeenCalledWith("a"));
    await waitFor(() => expect(document.querySelector(".ProseMirror")).toBeInTheDocument());
    expect(sidebar.classList.contains("sb-sidebar-open")).toBe(false);
  });
});
