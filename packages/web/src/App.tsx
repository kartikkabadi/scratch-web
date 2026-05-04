import { useEffect, useCallback, useState, useRef } from "react";
import { AppProvider, useAppData, useAppActions } from "./context/AppContext";
import { Sidebar } from "./components/layout/Sidebar";
import { Editor } from "./components/editor/Editor";
import { SettingsPage } from "./components/settings/SettingsPage";
import { OfflineState } from "./components/ui/OfflineState";
import { ConflictModal } from "./components/ui/ConflictModal";
import { Toast } from "./components/ui/Toast";
import { CommandPalette } from "./components/commands/CommandPalette";
import { useCommands } from "./hooks/useCommands";

export interface EditorActions {
  toggleSourceMode?: () => void;
  openFind?: () => void;
}

function editorWidthToCss(width: string | undefined, customWidth: number | undefined): string {
  if (width === "narrow") return "42rem";
  if (width === "wide") return "56rem";
  if (width === "full") return "100%";
  if (width === "custom") return `${customWidth ?? 720}px`;
  return "48rem";
}

function AppContent() {
  const {
    isLoading,
    error,
    isOnline,
    hasExternalChanges,
    view,
    currentNote,
    settings,
  } = useAppData();
  const { setError, reloadCurrentNote } = useAppActions();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const editorActionsRef = useRef<EditorActions>({});

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  useEffect(() => {
    const mode = settings?.theme.mode ?? "system";
    const root = document.documentElement;
    root.classList.toggle("dark", mode === "dark");
    root.classList.toggle("light", mode === "light");

    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
    const resolvedMode = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
    const activeColors = resolvedMode === "dark" ? settings?.customColorsDark : settings?.customColorsLight;
    const colorKeys = ["bg", "bg-secondary", "bg-muted", "bg-emphasis", "text", "text-muted", "accent", "border", "selection"];
    for (const key of colorKeys) {
      const value = activeColors?.[key];
      if (typeof value === "string" && value.trim()) {
        root.style.setProperty(`--color-${key}`, value);
      } else {
        root.style.removeProperty(`--color-${key}`);
      }
    }

    const font = settings?.editorFont;
    const family =
      font?.baseFontFamily === "serif"
        ? "Georgia, 'Times New Roman', serif"
        : font?.baseFontFamily === "monospace"
          ? "'SFMono-Regular', Consolas, 'Liberation Mono', monospace"
          : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
    root.style.setProperty("--editor-font-family", family);
    root.style.setProperty("--editor-base-font-size", `${font?.baseFontSize ?? 16}px`);
    root.style.setProperty("--editor-bold-weight", String(font?.boldWeight ?? 700));
    root.style.setProperty("--editor-line-height", String(font?.lineHeight ?? 1.6));
    root.style.setProperty("--app-zoom", `${settings?.interfaceZoom ?? 100}%`);
    root.style.setProperty("--editor-max-width", editorWidthToCss(settings?.editorWidth, settings?.customEditorWidthPx));
    root.dir = settings?.textDirection === "rtl" ? "rtl" : "ltr";
  }, [settings]);

  const handleReload = useCallback(() => {
    reloadCurrentNote();
  }, [reloadCurrentNote]);

  const handleSaveCopy = useCallback(() => {
    if (!currentNote) return;
    const copyContent = currentNote.content;
    const blob = new Blob([copyContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentNote.title || "note"}-copy.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentNote]);

  const handleToggleSourceMode = useCallback(() => {
    editorActionsRef.current.toggleSourceMode?.();
  }, []);

  const handleOpenFind = useCallback(() => {
    editorActionsRef.current.openFind?.();
  }, []);

  const handleToggleFocusMode = useCallback(() => {
    setFocusMode((fm) => !fm);
  }, []);

  const commands = useCommands({
    onToggleSourceMode: handleToggleSourceMode,
    onToggleFocusMode: handleToggleFocusMode,
    onOpenFind: handleOpenFind,
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && paletteOpen) {
        e.preventDefault();
        setPaletteOpen(false);
        return;
      }
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k" && !e.shiftKey) {
        e.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFocusMode((fm) => !fm);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [paletteOpen]);

  if (isLoading) {
    return (
      <div className="scratch-loading-shell">
        <div className="scratch-loading-card" aria-live="polite">
          <div className="scratch-loading-glyph" />
          <div className="scratch-loading-title">Opening Scratch</div>
          <div className="scratch-loading-subtitle">Preparing your notes workspace</div>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    return <OfflineState />;
  }

  return (
    <div
      className="scratch-app-shell"
      style={{
        height: "100%",
        display: "flex",
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text)",
        overflow: "hidden",
      }}
    >
      {view === "settings" ? (
        <SettingsPage />
      ) : (
        <>
          {!focusMode && <Sidebar />}
          <Editor
            focusMode={focusMode}
            actionsRef={editorActionsRef}
            onOpenPalette={() => setPaletteOpen(true)}
            onToggleFocusMode={handleToggleFocusMode}
          />
        </>
      )}
      {hasExternalChanges && (
        <ConflictModal onReload={handleReload} onSaveCopy={handleSaveCopy} />
      )}
      {error && <Toast message={error} onClose={() => setError(null)} />}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
