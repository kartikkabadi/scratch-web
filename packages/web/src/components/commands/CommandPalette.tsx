import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Command } from "../../commands/types";
import { SearchIcon, XIcon } from "../ui/icons";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: Command[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.filter((c) => !c.disabled);
    return commands.filter((c) => {
      if (c.disabled) return false;
      const text = `${c.label} ${c.category} ${c.keywords?.join(" ") ?? ""}`.toLowerCase();
      return text.includes(q);
    });
  }, [commands, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Command[]>();
    for (const cmd of filtered) {
      const list = map.get(cmd.category) || [];
      list.push(cmd);
      map.set(cmd.category, list);
    }
    return map;
  }, [filtered]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el?.scrollIntoView) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (filtered.length === 0) return;
        setSelectedIndex((i) => (i + 1 < filtered.length ? i + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (filtered.length === 0) return;
        setSelectedIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[selectedIndex];
        if (cmd) {
          void cmd.execute();
          onClose();
        }
        return;
      }
    },
    [filtered, selectedIndex, onClose],
  );

  if (!open) return null;

  let globalIndex = 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
        backgroundColor: "rgba(0,0,0,0.35)",
        backdropFilter: "blur(2px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(560px, 92vw)",
          maxHeight: "min(520px, 70vh)",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "var(--color-bg-secondary)",
          borderRadius: "12px",
          border: "1px solid var(--color-border)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          overflow: "hidden",
        }}
        role="dialog"
        aria-label="Command palette"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 14px",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <SearchIcon
            style={{
              width: 18,
              height: 18,
              color: "var(--color-text-muted)",
              flexShrink: 0,
            }}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands or notes..."
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--color-text)",
              fontSize: "0.9375rem",
              padding: 0,
            }}
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-text-muted)",
                cursor: "pointer",
                padding: "2px",
                flexShrink: 0,
              }}
            >
              <XIcon style={{ width: 16, height: 16 }} />
            </button>
          )}
        </div>

        <div
          ref={listRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "6px",
          }}
          className="scrollbar-none"
        >
          {filtered.length === 0 ? (
            <div
              style={{
                padding: "32px 16px",
                textAlign: "center",
                color: "var(--color-text-muted)",
                fontSize: "0.875rem",
              }}
            >
              No commands found
            </div>
          ) : (
            Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category}>
                <div
                  style={{
                    padding: "6px 10px 4px",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: "var(--color-text-muted)",
                    opacity: 0.7,
                  }}
                >
                  {category}
                </div>
                {items.map((cmd) => {
                  const idx = globalIndex++;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={cmd.id}
                      ref={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                      onClick={() => {
                        void cmd.execute();
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "none",
                        background: isSelected
                          ? "var(--color-bg-emphasis)"
                          : "transparent",
                        color: "var(--color-text)",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: "0.875rem",
                        minHeight: "36px",
                      }}
                    >
                      {cmd.icon && (
                        <span style={{ flexShrink: 0, display: "inline-flex" }}>
                          {cmd.icon}
                        </span>
                      )}
                      <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {cmd.label}
                      </span>
                      {cmd.shortcut && (
                        <kbd
                          style={{
                            fontSize: "0.6875rem",
                            color: "var(--color-text-muted)",
                            backgroundColor: "var(--color-bg-muted)",
                            padding: "1px 5px",
                            borderRadius: "4px",
                            border: "1px solid var(--color-border)",
                            flexShrink: 0,
                            fontFamily: "inherit",
                          }}
                        >
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: "12px",
            padding: "8px 14px",
            borderTop: "1px solid var(--color-border)",
            fontSize: "0.6875rem",
            color: "var(--color-text-muted)",
            opacity: 0.7,
          }}
        >
          <span>Enter to run</span>
          <span>Up/Down to navigate</span>
          <span>Esc to close</span>
        </div>
      </div>
    </div>
  );
}
