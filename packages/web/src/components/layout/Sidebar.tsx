import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAppData, useAppActions } from "../../context/AppContext";
import {
  SearchIcon,
  XIcon,
  PlusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  NoteIcon,
  PinIcon,
  SettingsIcon,
  MenuIcon,
  FolderIcon,
  TrashIcon,
  CopyIcon,
  MoreHorizontalIcon,
} from "../ui/icons";

function formatDate(ts: number): string {
  const date = new Date(ts * 1000);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
  if (date >= startOfToday) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (date >= startOfYesterday) return "Yesterday";
  const daysAgo = Math.floor((startOfToday.getTime() - date.getTime()) / 86400000) + 1;
  if (daysAgo <= 6) return `${daysAgo} days ago`;
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function cleanTitle(title: string): string {
  return title.replace(/^#+\s*/, "").trim() || "Untitled";
}

interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  notes: import("@scratch-web/shared").NoteMetadata[];
}

const COLLAPSED_FOLDERS_STORAGE_KEY = "scratch-web:collapsed-folders";

function readCollapsedFolders(): Set<string> {
  try {
    const raw = window.localStorage.getItem(COLLAPSED_FOLDERS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function writeCollapsedFolders(folders: Set<string>): void {
  try {
    window.localStorage.setItem(
      COLLAPSED_FOLDERS_STORAGE_KEY,
      JSON.stringify(Array.from(folders).sort()),
    );
  } catch {
    // localStorage can be unavailable in private or restricted contexts.
  }
}

function buildFolderTree(
  notes: import("@scratch-web/shared").NoteMetadata[],
  folderPaths: string[],
): {
  folders: FolderNode[];
  rootNotes: import("@scratch-web/shared").NoteMetadata[];
} {
  const rootNotes: import("@scratch-web/shared").NoteMetadata[] = [];
  const folderMap = new Map<string, FolderNode>();
  const getFolder = (path: string, name: string): FolderNode => {
    if (folderMap.has(path)) return folderMap.get(path)!;
    const node: FolderNode = { name, path, children: [], notes: [] };
    folderMap.set(path, node);
    return node;
  };
  for (const folderId of folderPaths) {
    let parent: FolderNode | null = null;
    let folderPath = "";
    for (const part of folderId.split("/").filter(Boolean)) {
      folderPath = folderPath ? `${folderPath}/${part}` : part;
      const folder = getFolder(folderPath, part);
      if (parent && !parent.children.some((child) => child.path === folder.path)) {
        parent.children.push(folder);
      }
      parent = folder;
    }
  }
  for (const note of notes) {
    const parts = note.id.split("/");
    if (parts.length === 1) {
      rootNotes.push(note);
      continue;
    }
    let parent: FolderNode | null = null;
    let folderPath = "";
    for (const part of parts.slice(0, -1)) {
      folderPath = folderPath ? `${folderPath}/${part}` : part;
      const folder = getFolder(folderPath, part);
      if (parent && !parent.children.some((child) => child.path === folder.path)) {
        parent.children.push(folder);
      }
      parent = folder;
    }
    parent?.notes.push(note);
  }
  const folders = Array.from(folderMap.values())
    .filter((folder) => !folder.path.includes("/"))
    .sort((a, b) => a.name.localeCompare(b.name));
  for (const folder of folderMap.values()) {
    folder.children.sort((a, b) => a.name.localeCompare(b.name));
    folder.notes.sort((a, b) => b.modified - a.modified);
  }
  return { folders, rootNotes };
}

export function Sidebar() {
  const {
    notes,
    folders: folderPaths,
    selectedNoteId,
    searchQuery,
    searchResults,
    foldersEnabled,
    sidebarOpen,
    settings,
  } = useAppData();
  const {
    selectNote,
    search,
    clearSearch,
    createNote,
    deleteNote,
    duplicateNote,
    pinNote,
    unpinNote,
    createNoteInFolder,
    createFolder,
    deleteFolder,
    renameFolder,
    setView,
    setSidebarOpen,
  } = useAppActions();
  const [searchOpen, setSearchOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    () => readCollapsedFolders(),
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  const pinnedIds = useMemo(
    () => new Set(settings?.pinnedNoteIds || []),
    [settings],
  );

  const displayItems = searchQuery.trim() ? searchResults : notes;
  const isSearching = searchQuery.trim().length > 0;

  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => search(value), 220);
    },
    [search],
  );

  const toggleSearch = useCallback(() => {
    if (searchOpen) {
      setInputValue("");
      clearSearch();
    }
    setSearchOpen((prev) => !prev);
  }, [clearSearch, searchOpen]);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        if (inputValue) {
          setInputValue("");
          clearSearch();
        } else {
          setSearchOpen(false);
          clearSearch();
        }
      }
    },
    [inputValue, clearSearch],
  );

  const toggleFolder = useCallback((folderPath: string) => {
    setCollapsedFolders((prev) => {
      const nxt = new Set(prev);
      if (nxt.has(folderPath)) nxt.delete(folderPath);
      else nxt.add(folderPath);
      writeCollapsedFolders(nxt);
      return nxt;
    });
  }, []);

  const handleCreateFolder = useCallback(() => {
    const name = window.prompt("Folder name");
    const trimmed = name?.trim();
    if (trimmed) createFolder("", trimmed);
  }, [createFolder]);

  const handleSelectNote = useCallback((id: string) => {
    void selectNote(id);
    setSidebarOpen(false);
  }, [selectNote, setSidebarOpen]);

  const handleCreateNote = useCallback(() => {
    void createNote().then(() => setSidebarOpen(false));
  }, [createNote, setSidebarOpen]);

  const handleCreateNoteInFolder = useCallback((folderPath: string) => {
    void createNoteInFolder(folderPath).then(() => setSidebarOpen(false));
  }, [createNoteInFolder, setSidebarOpen]);

  const { folders, rootNotes } = useMemo(() => {
    if (isSearching || !foldersEnabled) return { folders: [], rootNotes: displayItems };
    return buildFolderTree(displayItems, folderPaths);
  }, [displayItems, folderPaths, isSearching, foldersEnabled]);

  const sortedRootNotes = useMemo(() => {
    return [...rootNotes].sort((a, b) => {
      const aPinned = pinnedIds.has(a.id);
      const bPinned = pinnedIds.has(b.id);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return b.modified - a.modified;
    });
  }, [rootNotes, pinnedIds]);

  const sidebarClass = `sb-sidebar scratch-sidebar${sidebarOpen ? " sb-sidebar-open" : ""}`;

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="sb-mobile-overlay mobile-overlay"
        />
      )}

      {/* Mobile header */}
      <div className="sb-mobile-header mobile-header">
        <button
          onClick={() => setSidebarOpen(true)}
          className="sb-mobile-header-btn"
        >
          <MenuIcon style={{ width: 20, height: 20 }} />
        </button>
        <span className="sb-mobile-header-title">Scratch</span>
        <button
          onClick={() => setView("settings")}
          className="sb-mobile-header-btn"
        >
          <SettingsIcon style={{ width: 20, height: 20 }} />
        </button>
      </div>

      {/* Sidebar */}
      <aside className={sidebarClass}>
        {/* Header */}
        <div className="sb-header">
          <div className="sb-header-title-wrap">
            <span className="sb-header-title">Notes</span>
            <span className="sb-header-count">{notes.length}</span>
          </div>
          <div className="sb-header-actions">
            <button
              onClick={toggleSearch}
              className={`sb-action-btn${searchOpen ? " sb-action-btn-active" : ""}`}
            title="Search"
            aria-label="Search notes"
            >
              <SearchIcon style={{ width: 18, height: 18 }} />
            </button>
            {foldersEnabled && (
              <button
                onClick={handleCreateFolder}
                className="sb-action-btn"
                title="New Folder"
                aria-label="Create folder"
              >
                <FolderIcon style={{ width: 18, height: 18 }} />
              </button>
            )}
            <button
              onClick={handleCreateNote}
              className="sb-action-btn"
            title="New Note"
            aria-label="Create note"
            >
              <PlusIcon style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>

        {/* Search */}
        {searchOpen && (
          <div className="sb-search">
            <div className="sb-search-wrap">
              <input
                ref={searchInputRef}
                type="text"
                value={inputValue}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search notes..."
                autoFocus
                className="sb-search-input"
              />
              {inputValue && (
                <button
                  onClick={() => {
                    setInputValue("");
                    clearSearch();
                  }}
                  className="sb-search-clear"
                  aria-label="Clear search"
                >
                  <XIcon style={{ width: 16, height: 16 }} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Note list */}
        <div className="sb-note-list scrollbar-none">
          {displayItems.length === 0 ? (
            <div className="sb-empty-state">
              {isSearching ? "No results found" : "No notes yet"}
            </div>
          ) : (
            <>
              {foldersEnabled && !isSearching && (
                <>
                  {sortedRootNotes
                    .filter((n) => pinnedIds.has(n.id))
                    .map((note) => (
                      <NoteItem
                        key={note.id}
                        note={note}
                        selectedNoteId={selectedNoteId}
                        onSelect={handleSelectNote}
                        onDelete={deleteNote}
                        onDuplicate={duplicateNote}
                        onTogglePin={(id) => pinnedIds.has(id) ? unpinNote(id) : pinNote(id)}
                        pinned
                      />
                    ))}
                  {folders.map((folder) => (
                    <FolderItem
                      key={folder.path}
                      folder={folder}
                      selectedNoteId={selectedNoteId}
                      onSelect={handleSelectNote}
                      onDelete={deleteNote}
                      onDuplicate={duplicateNote}
                      onTogglePin={(id) =>
                        pinnedIds.has(id) ? unpinNote(id) : pinNote(id)
                      }
                      collapsed={collapsedFolders.has(folder.path)}
                      onToggle={toggleFolder}
                      isFolderCollapsed={(path) => collapsedFolders.has(path)}
                      pinnedIds={pinnedIds}
                      onCreateNote={handleCreateNoteInFolder}
                      onCreateFolder={createFolder}
                      onRenameFolder={renameFolder}
                      onDeleteFolder={deleteFolder}
                    />
                  ))}
                  {sortedRootNotes
                    .filter((n) => !pinnedIds.has(n.id))
                    .map((note) => (
                      <NoteItem
                        key={note.id}
                        note={note}
                        selectedNoteId={selectedNoteId}
                        onSelect={handleSelectNote}
                        onDelete={deleteNote}
                        onDuplicate={duplicateNote}
                        onTogglePin={(id) =>
                          pinnedIds.has(id) ? unpinNote(id) : pinNote(id)
                        }
                      />
                    ))}
                </>
              )}
              {(!foldersEnabled || isSearching) &&
                displayItems.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    selectedNoteId={selectedNoteId}
                    onSelect={handleSelectNote}
                    onDelete={deleteNote}
                    onDuplicate={duplicateNote}
                    onTogglePin={(id) =>
                      pinnedIds.has(id) ? unpinNote(id) : pinNote(id)
                    }
                    pinned={pinnedIds.has(note.id)}
                  />
                ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sb-footer">
          <span className="sb-footer-label">Scratch Web</span>
          <button
            onClick={() => setView("settings")}
            className="sb-footer-settings-btn"
            title="Settings"
          >
            <SettingsIcon style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </aside>
    </>
  );
}

function NoteItem({
  note,
  selectedNoteId,
  onSelect,
  onDelete,
  onDuplicate,
  onTogglePin,
  pinned,
}: {
  note: import("@scratch-web/shared").NoteMetadata;
  selectedNoteId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onTogglePin: (id: string) => void;
  pinned?: boolean;
}) {
  const isSelected = selectedNoteId === note.id;
  const [menuOpen, setMenuOpen] = useState(false);
  const folder = note.id.includes("/")
    ? note.id.substring(0, note.id.lastIndexOf("/"))
    : null;
  return (
    <div
      onClick={() => onSelect(note.id)}
      className={`sb-note-item${isSelected ? " sb-note-item-selected" : ""}`}
    >
      {pinned ? (
        <PinIcon
          className="sb-note-icon"
          style={{ width: 14, height: 14 }}
        />
      ) : (
        <NoteIcon
          className="sb-note-icon sb-note-icon-muted"
          style={{ width: 14, height: 14 }}
        />
      )}
      <div className="sb-note-body">
        <div className="sb-note-title">
          {cleanTitle(note.title)}
        </div>
        {folder && (
          <div className="sb-note-folder">
            {folder}/
          </div>
        )}
      </div>
      <span className="sb-note-date">
        {formatDate(note.modified)}
      </span>
      <button
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((open) => !open);
        }}
        className="sb-note-action-btn"
        title={`Note Actions ${note.id}`}
        aria-label={`Note actions for ${cleanTitle(note.title)}`}
      >
        <MoreHorizontalIcon style={{ width: 14, height: 14 }} />
      </button>
      {menuOpen && (
        <div
          onClick={(event) => event.stopPropagation()}
          className="sb-note-actions"
        >
          <button
            onClick={() => {
              onTogglePin(note.id);
              setMenuOpen(false);
            }}
            className="sb-note-action-btn"
            title={pinned ? "Unpin Note" : "Pin Note"}
          >
            <PinIcon style={{ width: 13, height: 13 }} />
          </button>
          <button
            onClick={() => {
              onDuplicate(note.id);
              setMenuOpen(false);
            }}
            className="sb-note-action-btn"
            title="Duplicate Note"
          >
            <CopyIcon style={{ width: 13, height: 13 }} />
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete "${cleanTitle(note.title)}"?`)) {
                onDelete(note.id);
              }
              setMenuOpen(false);
            }}
            className="sb-note-action-btn"
            title="Delete Note"
          >
            <TrashIcon style={{ width: 13, height: 13 }} />
          </button>
        </div>
      )}
    </div>
  );
}

function FolderItem({
  folder,
  selectedNoteId,
  onSelect,
  onDelete,
  onDuplicate,
  onTogglePin,
  collapsed,
  onToggle,
  isFolderCollapsed,
  pinnedIds,
  onCreateNote,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: {
  folder: FolderNode;
  selectedNoteId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onTogglePin: (id: string) => void;
  collapsed: boolean;
  onToggle: (path: string) => void;
  isFolderCollapsed: (path: string) => boolean;
  pinnedIds: Set<string>;
  onCreateNote: (folderPath: string) => void;
  onCreateFolder: (parentPath: string, name: string) => void;
  onRenameFolder: (oldPath: string, newName: string) => void;
  onDeleteFolder: (path: string) => void;
}) {
  const createChildFolder = useCallback(() => {
    const name = window.prompt("Folder name");
    const trimmed = name?.trim();
    if (trimmed) onCreateFolder(folder.path, trimmed);
  }, [folder.path, onCreateFolder]);

  const renameThisFolder = useCallback(() => {
    const name = window.prompt("Rename folder", folder.name);
    const trimmed = name?.trim();
    if (trimmed && trimmed !== folder.name) onRenameFolder(folder.path, trimmed);
  }, [folder.name, folder.path, onRenameFolder]);

  const deleteThisFolder = useCallback(() => {
    if (window.confirm(`Delete "${folder.name}" and its notes?`)) {
      onDeleteFolder(folder.path);
    }
  }, [folder.name, folder.path, onDeleteFolder]);

  return (
    <div>
      <div
        onClick={() => onToggle(folder.path)}
        className="sb-folder-row"
      >
        {collapsed ? (
          <ChevronRightIcon
            className="sb-folder-chevron"
            style={{ width: 14, height: 14 }}
          />
        ) : (
          <ChevronDownIcon
            className="sb-folder-chevron"
            style={{ width: 14, height: 14 }}
          />
        )}
        <span className="sb-folder-name">
          {folder.name}
        </span>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onCreateNote(folder.path);
          }}
          className="sb-folder-action-btn"
          title={`New Note in ${folder.path}`}
        >
          <PlusIcon style={{ width: 14, height: 14 }} />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            createChildFolder();
          }}
          className="sb-folder-action-btn"
          title={`New Folder in ${folder.path}`}
        >
          <FolderIcon style={{ width: 14, height: 14 }} />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            renameThisFolder();
          }}
          className="sb-folder-action-btn"
          title={`Rename Folder ${folder.path}`}
          aria-label={`Rename folder ${folder.path}`}
        >
          <MoreHorizontalIcon style={{ width: 14, height: 14 }} />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            deleteThisFolder();
          }}
          className="sb-folder-action-btn"
          title={`Delete Folder ${folder.path}`}
          aria-label={`Delete folder ${folder.path}`}
        >
          <XIcon style={{ width: 14, height: 14 }} />
        </button>
      </div>
      {!collapsed && (
        <div className="sb-folder-children">
          {folder.children.map((child) => (
            <FolderItem
              key={child.path}
              folder={child}
              selectedNoteId={selectedNoteId}
              onSelect={onSelect}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onTogglePin={onTogglePin}
              collapsed={isFolderCollapsed(child.path)}
              onToggle={onToggle}
              isFolderCollapsed={isFolderCollapsed}
              pinnedIds={pinnedIds}
              onCreateNote={onCreateNote}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
          {folder.notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              selectedNoteId={selectedNoteId}
              onSelect={onSelect}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onTogglePin={onTogglePin}
              pinned={pinnedIds.has(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
