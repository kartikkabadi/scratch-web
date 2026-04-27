import { useCallback, useEffect, useRef, useState } from "react";
import { XIcon, ArrowLeftIcon } from "../ui/icons";

interface FindToolbarProps {
  open: boolean;
  onClose: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function FindToolbar({ open, onClose, containerRef }: FindToolbarProps) {
  const [query, setQuery] = useState("");
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const matchesRef = useRef<Range[]>([]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    matchesRef.current = [];
  }, []);

  const selectMatch = useCallback((idx: number) => {
    const range = matchesRef.current[idx];
    if (!range) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    const anchor =
      range.startContainer.parentElement ??
      range.commonAncestorContainer.parentElement;
    anchor?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, []);

  const findMatches = useCallback(() => {
    clearSelection();
    if (!query || !containerRef.current) {
      setTotal(0);
      setCurrent(0);
      return;
    }

    const container = containerRef.current;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.closest("[data-ignore-find]")) continue;
      textNodes.push(node as Text);
    }

    const q = query.toLowerCase();
    const newMatches: Range[] = [];

    for (const textNode of textNodes) {
      const text = textNode.textContent || "";
      const lower = text.toLowerCase();
      let pos = 0;
      while ((pos = lower.indexOf(q, pos)) !== -1) {
        const end = pos + q.length;
        const range = document.createRange();
        range.setStart(textNode, pos);
        range.setEnd(textNode, end);
        newMatches.push(range);
        pos = end;
      }
    }

    matchesRef.current = newMatches;
    setTotal(newMatches.length);
    setCurrent(newMatches.length > 0 ? 1 : 0);

    if (newMatches.length > 0) {
      selectMatch(0);
    }
  }, [query, containerRef, clearSelection, selectMatch]);

  const goTo = useCallback(
    (idx: number) => {
      if (total === 0) return;
      const target = ((idx - 1 + total) % total) + 1;
      setCurrent(target);
      selectMatch(target - 1);
    },
    [total, selectMatch],
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setCurrent(0);
      setTotal(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      clearSelection();
    }
  }, [open, clearSelection]);

  useEffect(() => {
    const timeout = setTimeout(findMatches, 150);
    return () => clearTimeout(timeout);
  }, [query, findMatches]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          goTo(current - 1);
        } else {
          goTo(current + 1);
        }
        return;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose, current, goTo]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: "8px",
        backgroundColor: "var(--color-bg-secondary)",
        border: "1px solid var(--color-border)",
        borderRadius: "8px",
        padding: "6px 10px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        minWidth: "260px",
      }}
      data-ignore-find
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Find..."
        style={{
          flex: 1,
          border: "none",
          outline: "none",
          background: "transparent",
          color: "var(--color-text)",
          fontSize: "0.875rem",
          padding: 0,
          minWidth: 0,
        }}
      />
      {total > 0 && (
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--color-text-muted)",
            flexShrink: 0,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {current} / {total}
        </span>
      )}
      <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
        <button
          onClick={() => goTo(current - 1)}
          disabled={total === 0}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: total === 0 ? "default" : "pointer",
            padding: "2px",
            borderRadius: "4px",
            opacity: total === 0 ? 0.4 : 1,
            transform: "rotate(-90deg)",
          }}
          title="Previous"
        >
          <ArrowLeftIcon style={{ width: 16, height: 16 }} />
        </button>
        <button
          onClick={() => goTo(current + 1)}
          disabled={total === 0}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: total === 0 ? "default" : "pointer",
            padding: "2px",
            borderRadius: "4px",
            opacity: total === 0 ? 0.4 : 1,
            transform: "rotate(90deg)",
          }}
          title="Next"
        >
          <ArrowLeftIcon style={{ width: 16, height: 16 }} />
        </button>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            padding: "2px",
            borderRadius: "4px",
          }}
          title="Close"
        >
          <XIcon style={{ width: 16, height: 16 }} />
        </button>
      </div>
    </div>
  );
}
