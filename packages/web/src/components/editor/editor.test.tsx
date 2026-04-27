import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import App from "../../App";
import type { NoteMetadata, Settings } from "@scratch-web/shared";

const mockNotes: NoteMetadata[] = [
  { id: "a", title: "A", preview: "", modified: 1, version: { mtimeMs: 1, size: 1, sha256: "a" } },
];

const mockSettingsAuto: Settings = {
  theme: { mode: "dark" },
  saveMode: "auto",
};

const mockSettingsManual: Settings = {
  theme: { mode: "dark" },
  saveMode: "manual",
};

vi.mock("../../services/api", () => ({
  getNotesFolder: vi.fn(() => Promise.resolve({ path: "/tmp/notes" })),
  listNotes: vi.fn(() => Promise.resolve(mockNotes)),
  listFolders: vi.fn(() => Promise.resolve([])),
  readNote: vi.fn(() =>
    Promise.resolve({
      id: "a",
      title: "A",
      content: "# Hello\n\nWorld",
      path: "/tmp/a.md",
      modified: 1,
      version: { mtimeMs: 1, size: 10, sha256: "h" },
    }),
  ),
  getSettings: vi.fn(() => Promise.resolve(mockSettingsAuto)),
  checkHealth: vi.fn(() => Promise.resolve({ ok: true })),
  saveNote: vi.fn(() =>
    Promise.resolve({
      id: "a",
      title: "A",
      content: "# Hello\n\nWorld",
      path: "/tmp/a.md",
      modified: 2,
      version: { mtimeMs: 2, size: 10, sha256: "h2" },
    }),
  ),
  createNote: vi.fn(),
  deleteNote: vi.fn(),
  updateSettings: vi.fn(),
  searchNotes: vi.fn(),
  importAsset: vi.fn(),
}));

describe("Editor integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.classList.remove("dark", "light");
  });

  it("renders TipTap editor when a note is selected", async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText("Initializing Scratch...")).not.toBeInTheDocument());
    fireEvent.click(screen.getByText("A"));
    await waitFor(() => expect(document.querySelector(".ProseMirror")).toBeInTheDocument());
  });

  it("shows source mode control when a note is selected", async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText("Initializing Scratch...")).not.toBeInTheDocument());
    fireEvent.click(screen.getByText("A"));
    await waitFor(() => expect(document.querySelector(".ProseMirror")).toBeInTheDocument());

    const sourceButton = screen.getByTestId("source-mode-toggle");
    expect(sourceButton).toBeInTheDocument();
    expect(sourceButton).toHaveTextContent("Source");
  });

  it("shows Save button in manual save mode", async () => {
    const { getSettings } = await import("../../services/api");
    vi.mocked(getSettings).mockResolvedValueOnce(mockSettingsManual);

    render(<App />);
    await waitFor(() => expect(screen.queryByText("Initializing Scratch...")).not.toBeInTheDocument());
    fireEvent.click(screen.getByText("A"));
    await waitFor(() => expect(screen.getByText("Save")).toBeInTheDocument());
  });

  it("does not show Save button in auto save mode", async () => {
    render(<App />);
    await waitFor(() => expect(screen.queryByText("Initializing Scratch...")).not.toBeInTheDocument());
    fireEvent.click(screen.getByText("A"));
    await waitFor(() => expect(document.querySelector(".ProseMirror")).toBeInTheDocument());
    expect(screen.queryByText("Save")).not.toBeInTheDocument();
  });
});
