import { useEffect, useRef, useState } from "react";

export interface LinkEditorProps {
  initialUrl: string;
  initialText?: string;
  onSubmit: (url: string, text?: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}

export function LinkEditor({ initialUrl, initialText, onSubmit, onRemove, onCancel }: LinkEditorProps) {
  const hasExistingLink = !!initialUrl;
  const needsText = initialText !== undefined;
  const urlInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(initialText || "");
  const [url, setUrl] = useState(initialUrl);

  useEffect(() => {
    requestAnimationFrame(() => {
      if (needsText) {
        textInputRef.current?.focus();
        textInputRef.current?.select();
      } else {
        urlInputRef.current?.focus();
        urlInputRef.current?.select();
      }
    });
  }, [needsText]);

  const handleSubmit = () => {
    if (needsText) {
      onSubmit(url, text);
    } else {
      onSubmit(url);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
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
        gap: needsText ? "0" : "4px",
        flexDirection: needsText ? "column" : "row",
        alignItems: needsText ? "stretch" : "center",
        backgroundColor: "var(--color-bg)",
        border: "1px solid var(--color-border)",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        padding: "6px",
        maxWidth: "90vw",
      }}
    >
      <div style={{ display: "flex", gap: "6px", flexDirection: needsText ? "column" : "row" }}>
        {needsText && (
          <input
            ref={textInputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Link text..."
            onKeyDown={handleKeyDown}
            style={{
              width: needsText ? "280px" : "220px",
              height: "36px",
              borderRadius: "6px",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-bg)",
              color: "var(--color-text)",
              padding: "0 10px",
              fontSize: "0.875rem",
              outline: "none",
            }}
          />
        )}
        <input
          ref={urlInputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter URL..."
          onKeyDown={handleKeyDown}
          style={{
            width: needsText ? "280px" : "220px",
            height: "36px",
            borderRadius: "6px",
            border: "1px solid var(--color-border)",
            backgroundColor: "var(--color-bg)",
            color: "var(--color-text)",
            padding: "0 10px",
            fontSize: "0.875rem",
            outline: "none",
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: "4px",
          alignItems: "center",
          marginLeft: needsText ? "0" : "6px",
          marginTop: needsText ? "6px" : "0",
          justifyContent: needsText ? "flex-end" : "flex-start",
        }}
      >
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
        {hasExistingLink && (
          <button
            type="button"
            onClick={onRemove}
            title="Remove link"
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
              <path d="M18.36 6.64a9 9 0 11-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
          </button>
        )}
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
