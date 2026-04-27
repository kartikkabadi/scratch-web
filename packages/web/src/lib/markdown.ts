const ALLOWED_URL_SCHEMES = ["http:", "https:", "mailto:"];

export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function isAllowedUrlScheme(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_URL_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function sanitizeUrl(url: string): string {
  const normalized = normalizeUrl(url);
  if (isAllowedUrlScheme(normalized)) return normalized;
  return "";
}
