import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type {
  Note,
  NoteMetadata,
  Settings,
  SearchResult,
} from "@scratch-web/shared";
import * as api from "../services/api";

interface AppData {
  notes: NoteMetadata[];
  folders: string[];
  selectedNoteId: string | null;
  currentNote: Note | null;
  notesFolder: string | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  hasExternalChanges: boolean;
  reloadVersion: number;
  settings: Settings | null;
  isOnline: boolean;
  foldersEnabled: boolean;
  sidebarOpen: boolean;
  view: "notes" | "settings";
}

interface AppActions {
  selectNote: (id: string) => Promise<void>;
  createNote: () => Promise<void>;
  saveNote: (content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  duplicateNote: (id: string) => Promise<void>;
  refreshNotes: () => Promise<void>;
  reloadCurrentNote: () => Promise<void>;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  pinNote: (id: string) => Promise<void>;
  unpinNote: (id: string) => Promise<void>;
  createNoteInFolder: (folderPath: string) => Promise<void>;
  createFolder: (parentPath: string, name: string) => Promise<void>;
  deleteFolder: (path: string) => Promise<void>;
  renameFolder: (oldPath: string, newName: string) => Promise<void>;
  moveNote: (id: string, targetFolder: string) => Promise<void>;
  moveFolder: (path: string, targetParent: string) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  setSidebarOpen: (open: boolean) => void;
  setView: (view: "notes" | "settings") => void;
  setError: (error: string | null) => void;
}

const AppDataContext = createContext<AppData | null>(null);
const AppActionsContext = createContext<AppActions | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<NoteMetadata[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [notesFolder, setNotesFolder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setErrorState] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasExternalChanges, setHasExternalChanges] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [view, setView] = useState<"notes" | "settings">("notes");

  const selectRequestIdRef = useRef(0);
  const searchRequestIdRef = useRef(0);
  const refreshTimeoutRef = useRef<number | null>(null);
  const selectedNoteIdRef = useRef<string | null>(null);
  const foldersEnabled = settings?.foldersEnabled === true;

  selectedNoteIdRef.current = selectedNoteId;

  const refreshNotes = useCallback(async () => {
    if (!notesFolder) return;
    try {
      const list = await api.listNotes();
      const folderList = await api.listFolders();
      setNotes(list);
      setFolders(folderList);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load notes";
      setErrorState(msg);
    }
  }, [notesFolder]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    refreshTimeoutRef.current = window.setTimeout(() => {
      refreshTimeoutRef.current = null;
      refreshNotes();
    }, 300);
  }, [refreshNotes]);

  const selectNote = useCallback(async (id: string) => {
    const requestId = ++selectRequestIdRef.current;
    try {
      setSelectedNoteId(id);
      setHasExternalChanges(false);
      setView("notes");
      const note = await api.readNote(id);
      if (requestId !== selectRequestIdRef.current) return;
      setCurrentNote(note);
    } catch (err) {
      if (requestId !== selectRequestIdRef.current) return;
      setErrorState(err instanceof Error ? err.message : "Failed to load note");
    }
  }, []);

  const reloadCurrentNote = useCallback(async () => {
    if (!selectedNoteId) return;
    try {
      const note = await api.readNote(selectedNoteId);
      setCurrentNote(note);
      setHasExternalChanges(false);
      setReloadVersion((v) => v + 1);
    } catch (err) {
      setErrorState(
        err instanceof Error ? err.message : "Failed to reload note",
      );
    }
  }, [selectedNoteId]);

  const createNote = useCallback(async () => {
    try {
      let targetFolder: string | undefined;
      if (selectedNoteId) {
        const lastSlash = selectedNoteId.lastIndexOf("/");
        if (lastSlash > 0) {
          targetFolder = selectedNoteId.substring(0, lastSlash);
        }
      }
      const note = await api.createNote(targetFolder);
      selectRequestIdRef.current += 1;
      await refreshNotes();
      setCurrentNote(note);
      setSelectedNoteId(note.id);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err) {
      setErrorState(
        err instanceof Error ? err.message : "Failed to create note",
      );
    }
  }, [selectedNoteId, refreshNotes]);

  const saveNote = useCallback(
    async (content: string) => {
      if (!currentNote?.id) return;
      try {
        const updated = await api.saveNote(
          currentNote.id,
          content,
          currentNote.version,
        );
        setHasExternalChanges(false);
        if (selectedNoteIdRef.current === currentNote.id) {
          setCurrentNote(updated);
          setSelectedNoteId(updated.id);
        }
        scheduleRefresh();
      } catch (err) {
        const error = err as Error & { status?: number };
        if (error.status === 409) {
          setHasExternalChanges(true);
        }
        setErrorState(error.message || "Failed to save note");
      }
    },
    [currentNote, selectedNoteId, scheduleRefresh],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      try {
        await api.deleteNote(id);
        const currentSettings = await api.getSettings();
        const pinnedIds = currentSettings.pinnedNoteIds || [];
        if (pinnedIds.includes(id)) {
          await api.updateSettings({
            ...currentSettings,
            pinnedNoteIds: pinnedIds.filter((pid) => pid !== id),
          });
        }
        if (selectedNoteId === id) {
          setCurrentNote(null);
          setSelectedNoteId(null);
        }
        await refreshNotes();
      } catch (err) {
        setErrorState(
          err instanceof Error ? err.message : "Failed to delete note",
        );
      }
    },
    [refreshNotes, selectedNoteId],
  );

  const duplicateNote = useCallback(
    async (id: string) => {
      try {
        const newNote = await api.duplicateNote(id);
        selectRequestIdRef.current += 1;
        await refreshNotes();
        setCurrentNote(newNote);
        setSelectedNoteId(newNote.id);
      } catch (err) {
        setErrorState(
          err instanceof Error ? err.message : "Failed to duplicate note",
        );
      }
    },
    [refreshNotes],
  );

  const pinNote = useCallback(
    async (id: string) => {
      try {
        const currentSettings = await api.getSettings();
        const pinnedIds = currentSettings.pinnedNoteIds || [];
        if (!pinnedIds.includes(id)) {
          await api.updateSettings({
            ...currentSettings,
            pinnedNoteIds: [...pinnedIds, id],
          });
          await refreshNotes();
        }
      } catch (err) {
        setErrorState(
          err instanceof Error ? err.message : "Failed to pin note",
        );
      }
    },
    [refreshNotes],
  );

  const unpinNote = useCallback(
    async (id: string) => {
      try {
        const currentSettings = await api.getSettings();
        const pinnedIds = currentSettings.pinnedNoteIds || [];
        await api.updateSettings({
          ...currentSettings,
          pinnedNoteIds: pinnedIds.filter((pid) => pid !== id),
        });
        await refreshNotes();
      } catch (err) {
        setErrorState(
          err instanceof Error ? err.message : "Failed to unpin note",
        );
      }
    },
    [refreshNotes],
  );

  const createNoteInFolder = useCallback(
    async (folderPath: string) => {
      try {
        const note = await api.createNote(folderPath);
        selectRequestIdRef.current += 1;
        await refreshNotes();
        setCurrentNote(note);
        setSelectedNoteId(note.id);
        setSearchQuery("");
        setSearchResults([]);
      } catch (err) {
        setErrorState(
          err instanceof Error ? err.message : "Failed to create note",
        );
      }
    },
    [refreshNotes],
  );

  const createFolder = useCallback(
    async (parentPath: string, name: string) => {
      try {
        const fullPath = parentPath ? `${parentPath}/${name}` : name;
        await api.createFolder(fullPath);
        await refreshNotes();
      } catch (err) {
        setErrorState(
          err instanceof Error ? err.message : "Failed to create folder",
        );
      }
    },
    [refreshNotes],
  );

  const deleteFolder = useCallback(
    async (path: string) => {
      try {
        await api.deleteFolder(path);
        if (selectedNoteId?.startsWith(path + "/")) {
          setCurrentNote(null);
          setSelectedNoteId(null);
        }
        await refreshNotes();
      } catch (err) {
        setErrorState(
          err instanceof Error ? err.message : "Failed to delete folder",
        );
      }
    },
    [refreshNotes, selectedNoteId],
  );

  const renameFolder = useCallback(
    async (oldPath: string, newName: string) => {
      try {
        await api.renameFolder(oldPath, newName);
        const lastSlash = oldPath.lastIndexOf("/");
        const newPath =
          lastSlash >= 0
            ? `${oldPath.substring(0, lastSlash)}/${newName}`
            : newName;
        const oldPrefix = oldPath + "/";
        const newPrefix = newPath + "/";
        if (selectedNoteId?.startsWith(oldPrefix)) {
          const newId = newPrefix + selectedNoteId.substring(oldPrefix.length);
          setCurrentNote(await api.readNote(newId));
          setSelectedNoteId(newId);
        }
        await refreshNotes();
      } catch (err) {
        setErrorState(
          err instanceof Error ? err.message : "Failed to rename folder",
        );
      }
    },
    [refreshNotes, selectedNoteId],
  );

  const moveNote = useCallback(
    async (id: string, targetFolder: string) => {
      try {
        const result = await api.moveNote(id, targetFolder);
        if (selectedNoteId === id) {
          setCurrentNote(await api.readNote(result.id));
          setSelectedNoteId(result.id);
        }
        await refreshNotes();
      } catch (err) {
        setErrorState(
          err instanceof Error ? err.message : "Failed to move note",
        );
      }
    },
    [refreshNotes, selectedNoteId],
  );

  const moveFolder = useCallback(
    async (path: string, targetParent: string) => {
      try {
        await api.moveFolder(path, targetParent);
        const folderName = path.includes("/")
          ? path.substring(path.lastIndexOf("/") + 1)
          : path;
        const newPath = targetParent
          ? `${targetParent}/${folderName}`
          : folderName;
        const oldPrefix = path + "/";
        const newPrefix = newPath + "/";
        if (selectedNoteId?.startsWith(oldPrefix)) {
          const newId = newPrefix + selectedNoteId.substring(oldPrefix.length);
          setCurrentNote(await api.readNote(newId));
          setSelectedNoteId(newId);
        }
        await refreshNotes();
      } catch (err) {
        setErrorState(
          err instanceof Error ? err.message : "Failed to move folder",
        );
      }
    },
    [refreshNotes, selectedNoteId],
  );

  const updateSettings = useCallback(async (newSettings: Settings) => {
    try {
      await api.updateSettings(newSettings);
      setSettings(newSettings);
    } catch (err) {
      setErrorState(
        err instanceof Error ? err.message : "Failed to update settings",
      );
    }
  }, []);

  const search = useCallback(async (query: string) => {
    const requestId = ++searchRequestIdRef.current;
    setSearchQuery(query);
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    try {
      const results = await api.searchNotes(trimmed);
      if (requestId !== searchRequestIdRef.current) return;
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    }
    if (requestId !== searchRequestIdRef.current) return;
    setIsSearching(false);
  }, []);

  const clearSearch = useCallback(() => {
    searchRequestIdRef.current += 1;
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  }, []);

  const setError = useCallback((err: string | null) => {
    setErrorState(err);
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const { path } = await api.getNotesFolder();
        setNotesFolder(path);
        if (path) {
          const [list, folderList, s] = await Promise.all([
            api.listNotes(),
            api.listFolders().catch(() => []),
            api.getSettings().catch(() => null),
          ]);
          setNotes(list);
          setFolders(folderList);
          if (s) setSettings(s);
        }
      } catch (err) {
        setErrorState(
          err instanceof Error ? err.message : "Failed to initialize",
        );
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const checkOnline = async () => {
      try {
        const { ok } = await api.checkHealth();
        setIsOnline(ok);
      } catch {
        setIsOnline(false);
      }
    };
    checkOnline();
    const interval = setInterval(checkOnline, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handle = () => {
      setIsOnline(navigator.onLine);
    };
    window.addEventListener("online", handle);
    window.addEventListener("offline", handle);
    return () => {
      window.removeEventListener("online", handle);
      window.removeEventListener("offline", handle);
    };
  }, []);

  const dataValue = useMemo<AppData>(
    () => ({
      notes,
      folders,
      selectedNoteId,
      currentNote,
      notesFolder,
      isLoading,
      error,
      searchQuery,
      searchResults,
      isSearching,
      hasExternalChanges,
      reloadVersion,
      settings,
      isOnline,
      foldersEnabled,
      sidebarOpen,
      view,
    }),
    [
      notes,
      folders,
      selectedNoteId,
      currentNote,
      notesFolder,
      isLoading,
      error,
      searchQuery,
      searchResults,
      isSearching,
      hasExternalChanges,
      reloadVersion,
      settings,
      isOnline,
      foldersEnabled,
      sidebarOpen,
      view,
    ],
  );

  const actionsValue = useMemo<AppActions>(
    () => ({
      selectNote,
      createNote,
      saveNote,
      deleteNote,
      duplicateNote,
      refreshNotes,
      reloadCurrentNote,
      search,
      clearSearch,
      pinNote,
      unpinNote,
      createNoteInFolder,
      createFolder,
      deleteFolder,
      renameFolder,
      moveNote,
      moveFolder,
      updateSettings,
      setSidebarOpen,
      setView,
      setError,
    }),
    [
      selectNote,
      createNote,
      saveNote,
      deleteNote,
      duplicateNote,
      refreshNotes,
      reloadCurrentNote,
      search,
      clearSearch,
      pinNote,
      unpinNote,
      createNoteInFolder,
      createFolder,
      deleteFolder,
      renameFolder,
      moveNote,
      moveFolder,
      updateSettings,
      setSidebarOpen,
      setView,
      setError,
    ],
  );

  return (
    <AppActionsContext.Provider value={actionsValue}>
      <AppDataContext.Provider value={dataValue}>
        {children}
      </AppDataContext.Provider>
    </AppActionsContext.Provider>
  );
}

export function useAppData(): AppData {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppProvider");
  return ctx;
}

export function useAppActions(): AppActions {
  const ctx = useContext(AppActionsContext);
  if (!ctx) throw new Error("useAppActions must be used within AppProvider");
  return ctx;
}

export function useApp(): AppData & AppActions {
  return { ...useAppData(), ...useAppActions() };
}
