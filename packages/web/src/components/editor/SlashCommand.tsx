import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor, Range } from "@tiptap/core";

interface SlashItem {
  title: string;
  icon: React.ReactNode;
  command: (editor: Editor, range: Range) => void;
}

const slashItems: SlashItem[] = [
  {
    title: "Heading 1",
    icon: <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>H1</span>,
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    title: "Heading 2",
    icon: <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>H2</span>,
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    title: "Heading 3",
    icon: <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>H3</span>,
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    title: "Heading 4",
    icon: <span style={{ fontSize: "0.875rem", fontWeight: 700 }}>H4</span>,
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 4 }).run(),
  },
  {
    title: "Bullet List",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    title: "Ordered List",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="10" y1="6" x2="21" y2="6" />
        <line x1="10" y1="12" x2="21" y2="12" />
        <line x1="10" y1="18" x2="21" y2="18" />
        <path d="M4 6h1v4M4 10h2M3 18h3v-4H3v2h2" />
      </svg>
    ),
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    title: "Task List",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
    ),
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    title: "Blockquote",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3" />
      </svg>
    ),
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    title: "Code Block",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    title: "Table",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
        <line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    ),
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: "Horizontal Rule",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    title: "Block Math",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 4v16M18 4v16M6 12h12" />
      </svg>
    ),
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent({ type: "blockMath", attrs: { latex: "" } }).run(),
  },
  {
    title: "Wikilink",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
      </svg>
    ),
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertContent("[[").run(),
  },
];

export function getSlashItems(query: string): SlashItem[] {
  const q = query.toLowerCase().trim();
  if (!q) return slashItems;
  return slashItems.filter((item) =>
    item.title.toLowerCase().includes(q),
  );
}

export function SlashCommandList({
  items,
  command,
}: {
  items: SlashItem[];
  command: (item: SlashItem) => void;
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
        No results
      </div>
    );
  }

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{
        maxHeight: "280px",
        overflowY: "auto",
      }}
      className="scrollbar-none"
    >
      {items.map((item, idx) => (
        <button
          key={item.title}
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
          <span style={{ flexShrink: 0, display: "inline-flex", color: "var(--color-text-muted)" }}>
            {item.icon}
          </span>
          <span>{item.title}</span>
        </button>
      ))}
    </div>
  );
}

export type { SlashItem };
