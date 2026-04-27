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
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
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

  const sidebarStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: "280px",
    maxWidth: "80vw",
    zIndex: 40,
    backgroundColor: "var(--color-bg-secondary)",
    borderRight: "1px solid var(--color-border)",
    display: "flex",
    flexDirection: "column",
    transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
    transition: "transform 0.25s ease-out",
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 35,
            backgroundColor: "rgba(0,0,0,0.3)",
            backdropFilter: "blur(2px)",
          }}
          className="mobile-overlay"
        />
      )}

      {/* Mobile header */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          height: "48px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          backgroundColor: "var(--color-bg-secondary)",
          borderBottom: "1px solid var(--color-border)",
        }}
        className="mobile-header"
      >
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text)",
            cursor: "pointer",
            padding: "4px",
          }}
        >
          <MenuIcon style={{ width: 20, height: 20 }} />
        </button>
        <span
          style={{
            fontWeight: 600,
            fontSize: "0.9375rem",
            color: "var(--color-text)",
          }}
        >
          Scratch
        </span>
        <button
          onClick={() => setView("settings")}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            padding: "4px",
          }}
        >
          <SettingsIcon style={{ width: 20, height: 20 }} />
        </button>
      </div>

      {/* Sidebar */}
      <aside style={sidebarStyle} className="scratch-sidebar">
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 12px 8px",
            borderBottom: "1px solid var(--color-border)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontWeight: 600,
                fontSize: "1rem",
                color: "var(--color-text)",
              }}
            >
              Notes
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 500,
                color: "var(--color-text-muted)",
                backgroundColor: "var(--color-bg-muted)",
                padding: "1px 6px",
                borderRadius: "4px",
              }}
            >
              {notes.length}
            </span>
          </div>
          <div style={{ display: "flex", gap: "2px" }}>
            <button
              onClick={toggleSearch}
              style={{
                background: "none",
                border: "none",
                color: searchOpen
                  ? "var(--color-text)"
                  : "var(--color-text-muted)",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "6px",
              }}
              title="Search"
            >
              <SearchIcon style={{ width: 18, height: 18 }} />
            </button>
            {foldersEnabled && (
              <button
                onClick={handleCreateFolder}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "6px",
                }}
                title="New Folder"
              >
                <FolderIcon style={{ width: 18, height: 18 }} />
              </button>
            )}
            <button
              onClick={handleCreateNote}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "6px",
              }}
              title="New Note"
            >
              <PlusIcon style={{ width: 20, height: 20 }} />
            </button>
          </div>
        </div>

        {/* Search */}
        {searchOpen && (
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid var(--color-border)",
              flexShrink: 0,
            }}
          >
            <div style={{ position: "relative" }}>
              <input
                ref={searchInputRef}
                type="text"
                value={inputValue}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search notes..."
                autoFocus
                style={{
                  width: "100%",
                  padding: "6px 28px 6px 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-bg)",
                  color: "var(--color-text)",
                  fontSize: "0.875rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {inputValue && (
                <button
                  onClick={() => {
                    setInputValue("");
                    clearSearch();
                  }}
                  style={{
                    position: "absolute",
                    right: "6px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    padding: "2px",
                  }}
                >
                  <XIcon style={{ width: 16, height: 16 }} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Note list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "4px",
          }}
          className="scrollbar-none"
        >
          {displayItems.length === 0 ? (
            <div
              style={{
                padding: "24px 12px",
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontSize: "0.875rem",
              }}
            >
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
        <div
          style={{
            padding: "8px 12px",
            borderTop: "1px solid var(--color-border)",
            flexShrink: 0,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-muted)",
            }}
          >
            Scratch Web
          </span>
          <button
            onClick={() => setView("settings")}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-text-muted)",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
            }}
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "7px 10px",
        borderRadius: "6px",
        cursor: "pointer",
        marginBottom: "1px",
        backgroundColor: isSelected
          ? "var(--color-bg-muted)"
          : "transparent",
      }}
    >
      {pinned ? (
        <PinIcon
          style={{
            width: 14,
            height: 14,
            color: "var(--color-text-muted)",
            flexShrink: 0,
          }}
        />
      ) : (
        <NoteIcon
          style={{
            width: 14,
            height: 14,
            color: "var(--color-text-muted)",
            opacity: 0.5,
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: "0.8125rem",
            fontWeight: isSelected ? 600 : 400,
            color: "var(--color-text)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {cleanTitle(note.title)}
        </div>
        {folder && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--color-text-muted)",
              opacity: 0.7,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {folder}/
          </div>
        )}
      </div>
      <span
        style={{
          fontSize: "0.6875rem",
          color: "var(--color-text-muted)",
          opacity: 0.6,
          flexShrink: 0,
        }}
      >
        {formatDate(note.modified)}
      </span>
      <button
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((open) => !open);
        }}
        style={noteActionStyle}
        title={`Note Actions ${note.id}`}
      >
        ...
      </button>
      {menuOpen && (
        <div
          onClick={(event) => event.stopPropagation()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => {
              onTogglePin(note.id);
              setMenuOpen(false);
            }}
            style={noteActionStyle}
            title={pinned ? "Unpin Note" : "Pin Note"}
          >
            <PinIcon style={{ width: 13, height: 13 }} />
          </button>
          <button
            onClick={() => {
              onDuplicate(note.id);
              setMenuOpen(false);
            }}
            style={noteActionStyle}
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
            style={noteActionStyle}
            title="Delete Note"
          >
            <TrashIcon style={{ width: 13, height: 13 }} />
          </button>
        </div>
      )}
    </div>
  );
}

const noteActionStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--color-text-muted)",
  cursor: "pointer",
  padding: "2px",
  opacity: 0.65,
  flexShrink: 0,
};

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
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "6px 10px",
          borderRadius: "6px",
          cursor: "pointer",
          marginBottom: "1px",
        }}
      >
        {collapsed ? (
          <ChevronRightIcon
            style={{
              width: 14,
              height: 14,
              color: "var(--color-text-muted)",
              opacity: 0.5,
              flexShrink: 0,
            }}
          />
        ) : (
          <ChevronDownIcon
            style={{
              width: 14,
              height: 14,
              color: "var(--color-text-muted)",
              opacity: 0.5,
              flexShrink: 0,
            }}
          />
        )}
        <span
          style={{
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: "var(--color-text-muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1,
          }}
        >
          {folder.name}
        </span>
        <button
          onClick={(event) => {
            event.stopPropagation();
            onCreateNote(folder.path);
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            padding: "2px",
            opacity: 0.75,
          }}
          title={`New Note in ${folder.path}`}
        >
          <PlusIcon style={{ width: 14, height: 14 }} />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            createChildFolder();
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            padding: "2px",
            opacity: 0.75,
          }}
          title={`New Folder in ${folder.path}`}
        >
          <FolderIcon style={{ width: 14, height: 14 }} />
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            renameThisFolder();
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            padding: "0 3px",
            fontSize: "0.875rem",
            lineHeight: 1,
          }}
          title={`Rename Folder ${folder.path}`}
        >
          ...
        </button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            deleteThisFolder();
          }}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            padding: "0 3px",
            fontSize: "0.875rem",
            lineHeight: 1,
          }}
          title={`Delete Folder ${folder.path}`}
        >
          x
        </button>
      </div>
      {!collapsed && (
        <div style={{ paddingLeft: "12px" }}>
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
