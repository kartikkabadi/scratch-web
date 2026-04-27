import { useMemo } from "react";
import { renderMermaidSVG } from "beautiful-mermaid";
import DOMPurify from "dompurify";

interface MermaidRendererProps {
  code: string;
}

function readThemeColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function readMermaidTheme() {
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  if (isDark) {
    return {
      bg: "#1c1917",
      fg: "#f5f5f4",
      muted: "#a8a29e",
      line: "#a8a29e",
      accent: "#f5f5f4",
      surface: "#292524",
      border: "#57534e",
    };
  }

  return {
    bg: readThemeColor("--color-bg", "#fffdfa"),
    fg: readThemeColor("--color-text", "#1e1a17"),
    muted: "#78716c",
    line: "#78716c",
    accent: readThemeColor("--color-text", "#1e1a17"),
    surface: "#f5f0e8",
    border: "#d8d0c7",
  };
}

function inlineMermaidColors(svg: string, theme: ReturnType<typeof readMermaidTheme>): string {
  const replacements: Array<[string, string]> = [
    ["var(--_node-fill)", theme.surface],
    ["var(--_node-stroke)", theme.border],
    ["var(--_text)", theme.fg],
    ["var(--_text-sec)", theme.fg],
    ["var(--_text-muted)", theme.muted],
    ["var(--_line)", theme.line],
    ["var(--_arrow)", theme.accent],
    ["var(--_group-fill)", theme.bg],
    ["var(--_group-hdr)", theme.surface],
    ["var(--_inner-stroke)", theme.border],
    ["var(--_key-badge)", theme.surface],
  ];
  return replacements.reduce((current, [from, to]) => current.split(from).join(to), svg);
}

export function MermaidRenderer({ code }: MermaidRendererProps) {
  const { svg, error } = useMemo(() => {
    if (!code.trim()) return { svg: null, error: null };
    try {
      const theme = readMermaidTheme();
      return {
        svg: DOMPurify.sanitize(
          inlineMermaidColors(
            renderMermaidSVG(code.trim(), {
              bg: theme.bg,
              fg: theme.fg,
              muted: theme.muted,
              line: theme.line,
              accent: theme.accent,
              surface: theme.surface,
              border: theme.border,
              transparent: true,
            }),
            theme,
          ),
          { USE_PROFILES: { svg: true, svgFilters: true } },
        ),
        error: null,
      };
    } catch (err) {
      return {
        svg: null,
        error: err instanceof Error ? err.message : "Invalid mermaid syntax",
      };
    }
  }, [code]);

  if (error) {
    return (
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--color-text-muted)",
          fontStyle: "italic",
          padding: "24px 8px 12px",
          textAlign: "center",
        }}
      >
        Mermaid syntax error
      </div>
    );
  }

  if (!svg) {
    return (
      <div
        style={{
          fontSize: "0.75rem",
          color: "var(--color-text-muted)",
          fontStyle: "italic",
          padding: "24px 8px 12px",
          textAlign: "center",
        }}
      >
        Empty mermaid diagram
      </div>
    );
  }

  return (
    <div
      style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
