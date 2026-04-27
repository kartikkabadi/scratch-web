import { useEffect, useRef, useState } from "react";

export interface BlockMathEditorProps {
  initialLatex: string;
  onSubmit: (latex: string) => void;
  onCancel: () => void;
}

export function BlockMathEditor({ initialLatex, onSubmit, onCancel }: BlockMathEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [latex, setLatex] = useState(initialLatex);

  useEffect(() => {
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    });
  }, []);

  const handleSubmit = () => {
    onSubmit(latex);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Tab") {
      e.stopPropagation();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        backgroundColor: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        padding: "6px",
        width: "340px",
        maxWidth: "90vw",
      }}
    >
      <textarea
        ref={textareaRef}
        value={latex}
        onChange={(e) => setLatex(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter KaTeX expression..."
        style={{
          width: "100%",
          height: "120px",
          resize: "vertical",
          borderRadius: "6px",
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg)",
          color: "var(--color-text)",
          padding: "10px",
          fontSize: "0.875rem",
          fontFamily: "monospace",
          outline: "none",
        }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "4px" }}>
        <button
          type="button"
          onClick={handleSubmit}
          title="Apply"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "4px",
            color: "var(--color-text-muted)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onCancel}
          title="Cancel"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "4px",
            color: "var(--color-text-muted)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
