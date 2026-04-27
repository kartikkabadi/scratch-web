import { useMemo } from "react";
import type { Command } from "../commands/types";
import { useAppData, useAppActions } from "../context/AppContext";
import {
  getGitStatus,
  initGit,
  commitGit,
  pushGit,
  fetchGit,
  pullGit,
  syncGit,
} from "../services/api";
import {
  PlusIcon,
  CopyIcon,
  TrashIcon,
  PinIcon,
  SettingsIcon,
  SwatchIcon,
  NoteIcon,
  ArrowLeftIcon,
} from "../components/ui/icons";

function isMac() {
  return navigator.platform.toLowerCase().includes("mac");
}

function modKey(shortcut: string): string {
  const mod = isMac() ? "Cmd" : "Ctrl";
  return shortcut.replace("Mod", mod);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function useCommands({
  onToggleSourceMode,
  onToggleFocusMode,
  onOpenFind,
}: {
  onToggleSourceMode: () => void;
  onToggleFocusMode: () => void;
  onOpenFind: () => void;
}): Command[] {
  const {
    notes,
    currentNote,
    selectedNoteId,
    settings,
  } = useAppData();
  const {
    createNote,
    createFolder,
    deleteNote,
    duplicateNote,
    pinNote,
    unpinNote,
    reloadCurrentNote,
    selectNote,
    setView,
    updateSettings,
    setError,
  } = useAppActions();

  const pinnedIds = new Set(settings?.pinnedNoteIds || []);
  const isPinned = selectedNoteId ? pinnedIds.has(selectedNoteId) : false;

  return useMemo(() => {
    const cmds: Command[] = [];

    cmds.push({
      id: "new-note",
      label: "New Note",
      category: "Notes",
      icon: <PlusIcon style={{ width: 16, height: 16 }} />,
      shortcut: modKey("Mod+N"),
      execute: () => void createNote(),
    });

    cmds.push({
      id: "new-folder",
      label: "New Folder",
      category: "Notes",
      icon: <PlusIcon style={{ width: 16, height: 16 }} />,
      execute: () => {
        const name = window.prompt("Folder name");
        const trimmed = name?.trim();
        if (trimmed) void createFolder("", trimmed);
      },
    });

    if (selectedNoteId) {
      cmds.push({
        id: "duplicate-note",
        label: "Duplicate Note",
        category: "Notes",
        icon: <CopyIcon style={{ width: 16, height: 16 }} />,
        shortcut: modKey("Mod+D"),
        execute: () => void duplicateNote(selectedNoteId),
      });

      cmds.push({
        id: "delete-note",
        label: "Delete Note",
        category: "Notes",
        icon: <TrashIcon style={{ width: 16, height: 16 }} />,
        shortcut: modKey("Mod+Shift+Delete"),
        execute: () => {
          if (window.confirm("Delete this note?")) {
            void deleteNote(selectedNoteId);
          }
        },
      });

      cmds.push({
        id: isPinned ? "unpin-note" : "pin-note",
        label: isPinned ? "Unpin Note" : "Pin Note",
        category: "Notes",
        icon: <PinIcon style={{ width: 16, height: 16 }} />,
        execute: () => {
          if (isPinned) void unpinNote(selectedNoteId);
          else void pinNote(selectedNoteId);
        },
      });

      cmds.push({
        id: "reload-note",
        label: "Reload External Changes",
        category: "Notes",
        icon: <ArrowLeftIcon style={{ width: 16, height: 16, transform: "rotate(90deg)" }} />,
        execute: () => void reloadCurrentNote(),
      });

      cmds.push({
        id: "copy-markdown",
        label: "Copy Markdown",
        category: "Notes",
        icon: <CopyIcon style={{ width: 16, height: 16 }} />,
        execute: async () => {
          if (!currentNote) return;
          try {
            await navigator.clipboard.writeText(currentNote.content);
          } catch {
            setError("Failed to copy to clipboard");
          }
        },
      });

      cmds.push({
        id: "copy-plain",
        label: "Copy Plain Text",
        category: "Notes",
        icon: <CopyIcon style={{ width: 16, height: 16 }} />,
        execute: async () => {
          if (!currentNote) return;
          const text = currentNote.content.replace(/[#*_`\[\]]/g, "");
          try {
            await navigator.clipboard.writeText(text);
          } catch {
            setError("Failed to copy to clipboard");
          }
        },
      });

      cmds.push({
        id: "copy-html",
        label: "Copy HTML",
        category: "Notes",
        icon: <CopyIcon style={{ width: 16, height: 16 }} />,
        execute: async () => {
          if (!currentNote) return;
          try {
            const el = document.querySelector(".ProseMirror");
            if (el) {
              await navigator.clipboard.writeText(el.innerHTML);
            } else {
              await navigator.clipboard.writeText(
                `<pre>${escapeHtml(currentNote.content)}</pre>`,
              );
            }
          } catch {
            setError("Failed to copy to clipboard");
          }
        },
      });

      cmds.push({
        id: "export-markdown",
        label: "Export Markdown",
        category: "Notes",
        icon: <NoteIcon style={{ width: 16, height: 16 }} />,
        execute: () => {
          if (!currentNote) return;
          const blob = new Blob([currentNote.content], { type: "text/markdown" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${currentNote.title || "note"}.md`;
          a.click();
          URL.revokeObjectURL(url);
        },
      });

      cmds.push({
        id: "print-pdf",
        label: "Print / PDF",
        category: "Notes",
        icon: <NoteIcon style={{ width: 16, height: 16 }} />,
        execute: () => window.print(),
      });
    }

    cmds.push({
      id: "toggle-source",
      label: "Toggle Source Mode",
      category: "Editor",
      icon: <NoteIcon style={{ width: 16, height: 16 }} />,
      shortcut: modKey("Mod+Shift+M"),
      execute: onToggleSourceMode,
    });

    cmds.push({
      id: "toggle-focus",
      label: "Toggle Focus Mode",
      category: "Editor",
      icon: <NoteIcon style={{ width: 16, height: 16 }} />,
      shortcut: modKey("Mod+Shift+F"),
      execute: onToggleFocusMode,
    });

    cmds.push({
      id: "find-in-note",
      label: "Find in Note",
      category: "Editor",
      icon: <NoteIcon style={{ width: 16, height: 16 }} />,
      shortcut: modKey("Mod+F"),
      execute: onOpenFind,
    });

    cmds.push({
      id: "open-settings",
      label: "Open Settings",
      category: "App",
      icon: <SettingsIcon style={{ width: 16, height: 16 }} />,
      shortcut: modKey("Mod+,"),
      execute: () => setView("settings"),
    });

    cmds.push({
      id: "theme-light",
      label: "Theme: Light",
      category: "App",
      icon: <SwatchIcon style={{ width: 16, height: 16 }} />,
      execute: () => {
        if (settings) void updateSettings({ ...settings, theme: { ...settings.theme, mode: "light" } });
      },
    });

    cmds.push({
      id: "theme-dark",
      label: "Theme: Dark",
      category: "App",
      icon: <SwatchIcon style={{ width: 16, height: 16 }} />,
      execute: () => {
        if (settings) void updateSettings({ ...settings, theme: { ...settings.theme, mode: "dark" } });
      },
    });

    cmds.push({
      id: "theme-system",
      label: "Theme: System",
      category: "App",
      icon: <SwatchIcon style={{ width: 16, height: 16 }} />,
      execute: () => {
        if (settings) void updateSettings({ ...settings, theme: { ...settings.theme, mode: "system" } });
      },
    });

    cmds.push({
      id: "git-status",
      label: "Git: Status",
      category: "Git",
      icon: <NoteIcon style={{ width: 16, height: 16 }} />,
      execute: async () => {
        try {
          const status = await getGitStatus();
          setError(`Git: ${status.branch || "no branch"} ${status.clean ? "clean" : "dirty"}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Git not available");
        }
      },
    });

    cmds.push({
      id: "git-init",
      label: "Git: Initialize",
      category: "Git",
      icon: <NoteIcon style={{ width: 16, height: 16 }} />,
      execute: async () => {
        if (!window.confirm("Initialize a Git repository in your notes folder?")) return;
        try {
          await initGit();
          setError("Git repository initialized");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to init Git");
        }
      },
    });

    cmds.push({
      id: "git-commit",
      label: "Git: Commit",
      category: "Git",
      icon: <NoteIcon style={{ width: 16, height: 16 }} />,
      execute: async () => {
        const message = window.prompt("Commit message");
        if (!message?.trim()) return;
        try {
          await commitGit(message.trim());
          setError("Committed");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to commit");
        }
      },
    });

    cmds.push({
      id: "git-push",
      label: "Git: Push",
      category: "Git",
      icon: <NoteIcon style={{ width: 16, height: 16 }} />,
      execute: async () => {
        try {
          await pushGit();
          setError("Pushed");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to push");
        }
      },
    });

    cmds.push({
      id: "git-pull",
      label: "Git: Pull",
      category: "Git",
      icon: <NoteIcon style={{ width: 16, height: 16 }} />,
      execute: async () => {
        try {
          await pullGit();
          setError("Pulled");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to pull");
        }
      },
    });

    cmds.push({
      id: "git-fetch",
      label: "Git: Fetch",
      category: "Git",
      icon: <NoteIcon style={{ width: 16, height: 16 }} />,
      execute: async () => {
        try {
          await fetchGit();
          setError("Fetched");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to fetch");
        }
      },
    });

    cmds.push({
      id: "git-sync",
      label: "Git: Sync",
      category: "Git",
      icon: <NoteIcon style={{ width: 16, height: 16 }} />,
      execute: async () => {
        try {
          await syncGit();
          setError("Synced");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to sync");
        }
      },
    });

    for (const note of notes) {
      cmds.push({
        id: `note:${note.id}`,
        label: note.title || "Untitled",
        category: "Notes",
        icon: <NoteIcon style={{ width: 16, height: 16, opacity: 0.6 }} />,
        keywords: [note.id],
        execute: () => void selectNote(note.id),
      });
    }

    return cmds;
  }, [
    notes,
    currentNote,
    selectedNoteId,
    settings,
    isPinned,
    createNote,
    createFolder,
    deleteNote,
    duplicateNote,
    pinNote,
    unpinNote,
    reloadCurrentNote,
    selectNote,
    updateSettings,
    setView,
    setError,
    onToggleSourceMode,
    onToggleFocusMode,
    onOpenFind,
  ]);
}
