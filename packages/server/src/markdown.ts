const EFFECTIVELY_EMPTY_CHARS = new Set(["\u00A0", "\uFEFF"]);

export function isEffectivelyEmpty(value: string): boolean {
  return [...value].every((char) => char.trim() === "" || EFFECTIVELY_EMPTY_CHARS.has(char));
}

export function stripFrontmatter(content: string): string {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return content;
  }
  const rest = trimmed.slice(3);
  const end = rest.indexOf("\n---");
  if (end === -1) {
    return content;
  }
  const afterClose = rest.slice(end + 4);
  return afterClose.replace(/^\r?\n/, "");
}

export function extractTitle(content: string): string {
  const body = stripFrontmatter(content);
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("# ")) {
      const title = trimmed.slice(2).trim();
      if (!isEffectivelyEmpty(title)) {
        return title;
      }
    }
    if (!isEffectivelyEmpty(trimmed)) {
      return [...trimmed].slice(0, 50).join("");
    }
  }
  return "Untitled";
}

export function sanitizeFilename(title: string): string {
  const sanitized = [...title]
    .filter((char) => !EFFECTIVELY_EMPTY_CHARS.has(char))
    .map((char) => (/[\\/:*?"<>|]/u.test(char) ? "-" : char))
    .join("")
    .trim();
  return sanitized === "" || isEffectivelyEmpty(sanitized) ? "Untitled" : sanitized;
}

export function extractTitleFromId(id: string): string {
  const filename = id.split("/").at(-1) ?? id;
  return filename
    .replace(/[-_]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/^#+\s+/u, "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/gu, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, "$1")
    .replace(/(`|\*\*|__|~~)(.*?)\1/gu, "$2")
    .replace(/(^|\s)[*_]([^*_]+)[*_](?=\s|$)/gu, "$1$2")
    .replace(/^\s*[-+*]\s+/u, "")
    .replace(/^\s*\d+\.\s+/u, "")
    .replace(/^- \[[ xX]\]\s+/u, "")
    .trim();
}

export function generatePreview(content: string): string {
  const body = stripFrontmatter(content);
  for (const line of body.split(/\r?\n/).slice(1)) {
    const stripped = stripMarkdown(line.trim());
    if (stripped !== "") {
      return [...stripped].slice(0, 100).join("");
    }
  }
  return "";
}

