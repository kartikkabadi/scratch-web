import { useCallback, useEffect, useRef, useState } from "react";
import type { NoteMetadata } from "@scratch-web/shared";
import { NoteIcon } from "../ui/icons";

export interface WikilinkItem {
  id: string;
  title: string;
}

export function getWikilinkItems(query: string, notes: NoteMetadata[]): WikilinkItem[] {
  const q = query.toLowerCase().trim().replace(/^\[+/, "");
  if (!q) {
    return notes.slice(0, 10).map((n) => ({ id: n.id, title: n.title || "Untitled" }));
  }
  return notes
    .filter((n) => {
      const title = (n.title || "Untitled").toLowerCase();
      return title.includes(q) || n.id.toLowerCase().includes(q);
    })
    .slice(0, 10)
    .map((n) => ({ id: n.id, title: n.title || "Untitled" }));
}

export function WikilinkSuggestionList({
  items,
  command,
}: {
  items: WikilinkItem[];
  command: (item: WikilinkItem) => void;
}) {
  const [selected, setSelected] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    setSelected(0);
  }, [items]);

  useEffect(() => {
    const el = itemRefs.current[selected];
    if (el?.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((i) => (i + 1 < items.length ? i + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((i) => (i > 0 ? i - 1 : items.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        command(items[selected]);
      }
    },
    [items, selected, command],
  );

  if (items.length === 0) {
    return (
      <div
        style={{
          padding: "8px 12px",
          fontSize: "0.8125rem",
          color: "var(--color-text-muted)",
        }}
      >
        No notes found
      </div>
    );
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{
        maxHeight: "240px",
        overflowY: "auto",
      }}
      className="scrollbar-none"
    >
      {items.map((item, idx) => (
        <button
          key={item.id}
          ref={(el) => {
            itemRefs.current[idx] = el;
          }}
          onClick={() => command(item)}
          onMouseEnter={() => setSelected(idx)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "7px 10px",
            borderRadius: "6px",
            border: "none",
            background: idx === selected ? "var(--color-bg-emphasis)" : "transparent",
            color: "var(--color-text)",
            cursor: "pointer",
            textAlign: "left",
            fontSize: "0.875rem",
          }}
        >
          <NoteIcon style={{ width: 14, height: 14, flexShrink: 0, color: "var(--color-text-muted)", opacity: 0.6 }} />
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.title}
          </span>
        </button>
      ))}
    </div>
  );
}
