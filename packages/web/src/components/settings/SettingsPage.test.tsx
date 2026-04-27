import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { Settings } from "@scratch-web/shared";
import { SettingsPage } from "./SettingsPage";
import * as api from "../../services/api";

const mocks = vi.hoisted(() => ({
  settings: {
    theme: { mode: "system" },
    foldersEnabled: true,
    ignoredPatterns: ["node_modules"],
  } as Settings,
  updateSettings: vi.fn(),
  setError: vi.fn(),
  setView: vi.fn(),
}));

vi.mock("../../context/AppContext", () => ({
  useAppData: () => ({
    settings: mocks.settings,
    notesFolder: "/tmp/notes",
  }),
  useAppActions: () => ({
    updateSettings: mocks.updateSettings,
    setError: mocks.setError,
    setView: mocks.setView,
  }),
}));

vi.mock("../../services/api", () => ({
  getGitAvailability: vi.fn(() => Promise.resolve({ available: true, version: "git version 2.40.0" })),
  getGitStatus: vi.fn(() => Promise.resolve({
    available: true,
    initialized: true,
    branch: "main",
    upstream: "origin/main",
    ahead: 1,
    behind: 0,
    clean: false,
    entries: [{ path: "A.md", index: "M", workingTree: " " }],
  })),
  initGit: vi.fn(() => Promise.resolve({ ok: true, status: { initialized: true } })),
  commitGit: vi.fn(),
  pushGit: vi.fn(),
  fetchGit: vi.fn(),
  pullGit: vi.fn(),
  syncGit: vi.fn(),
  setGitRemote: vi.fn(),
  pushGitUpstream: vi.fn(),
}));

describe("SettingsPage M3E", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.settings = {
      theme: { mode: "system" },
      foldersEnabled: true,
      ignoredPatterns: ["node_modules"],
    };
  });

  it("updates save mode and ignored patterns from the Folder tab", () => {
    render(<SettingsPage />);

    fireEvent.click(screen.getByText("manual"));
    expect(mocks.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ saveMode: "manual" }));

    fireEvent.change(screen.getByPlaceholderText("folder-name"), { target: { value: "dist" } });
    fireEvent.click(screen.getByText("Add"));
    expect(mocks.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ ignoredPatterns: ["node_modules", "dist"] }));
  });

  it("shows Git status and confirms initialization", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<SettingsPage />);

    fireEvent.click(screen.getByText("Integrations"));
    fireEvent.click(screen.getByText("Refresh"));

    await waitFor(() => expect(api.getGitStatus).toHaveBeenCalled());
    expect(await screen.findByText("origin/main")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Init"));
    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(api.initGit).toHaveBeenCalled());
  });
});
