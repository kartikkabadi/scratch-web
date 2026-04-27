import { useCallback, useState } from "react";
import { NodeViewWrapper, NodeViewContent } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import { SUPPORTED_LANGUAGES } from "./lowlight";
import { MermaidRenderer } from "./MermaidRenderer";

const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  fontSize: "0.75rem",
  height: "24px",
  padding: "0 6px",
  color: "var(--color-text-muted)",
  borderRadius: "4px",
  cursor: "pointer",
  background: "none",
  border: "none",
};

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function CodeBlockView({ node, updateAttributes }: ReactNodeViewProps) {
  const language: string = node.attrs.language || "";
  const isMermaid = language === "mermaid";
  const [showSource, setShowSource] = useState(!node.textContent.trim());
  const codeContent = node.textContent;

  const handleLanguageChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateAttributes({ language: e.target.value });
    },
    [updateAttributes],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
    } catch {
      void 0;
    }
  }, [codeContent]);

  const toolbar = (
    <div
      contentEditable={false}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "4px 8px",
        borderBottom: "1px solid var(--color-border)",
        backgroundColor: "var(--color-bg-muted)",
        borderRadius: "8px 8px 0 0",
      }}
    >
      <button
        type="button"
        onClick={handleCopy}
        style={btnStyle}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text)";
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-bg-emphasis)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
        }}
        title="Copy"
      >
        <CopyIcon />
        <span>Copy</span>
      </button>
      {isMermaid && (
        <button
          type="button"
          contentEditable={false}
          onClick={() => setShowSource((s) => !s)}
          style={btnStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text)";
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-bg-emphasis)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-muted)";
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
          }}
        >
          {showSource ? (
            <>
              <EyeIcon />
              <span>Preview</span>
            </>
          ) : (
            <>
              <PencilIcon />
              <span>Edit</span>
            </>
          )}
        </button>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center", height: "24px", marginLeft: "auto" }}>
        <select
          value={language}
          onChange={handleLanguageChange}
          style={{
            appearance: "none",
            WebkitAppearance: "none",
            background: "transparent",
            color: "var(--color-text-muted)",
            fontSize: "0.75rem",
            height: "24px",
            cursor: "pointer",
            outline: "none",
            paddingRight: "16px",
            paddingLeft: "6px",
            borderRadius: "4px",
            border: "none",
          }}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
        <span style={{ position: "absolute", right: "2px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--color-text-muted)" }}>
          <ChevronDownIcon />
        </span>
      </div>
    </div>
  );

  if (isMermaid && !showSource) {
    return (
      <NodeViewWrapper className="code-block-wrapper mermaid-wrapper" as="div">
        {toolbar}
        <div
          contentEditable={false}
          style={{
            borderRadius: "0 0 8px 8px",
            backgroundColor: "var(--color-bg-muted)",
            padding: "16px",
            margin: "4px 0",
          }}
        >
          <MermaidRenderer code={codeContent} />
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            overflow: "hidden",
            height: 0,
            opacity: 0,
          }}
        >
          <pre>
            <code>
              <NodeViewContent />
            </code>
          </pre>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="code-block-wrapper" as="div">
      {toolbar}
      <pre style={{ margin: 0, borderRadius: "0 0 8px 8px" }}>
        <code>
          <NodeViewContent />
        </code>
      </pre>
    </NodeViewWrapper>
  );
}
