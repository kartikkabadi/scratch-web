import { describe, it, expect } from "vitest";
import { normalizeUrl, isAllowedUrlScheme, sanitizeUrl } from "./markdown";

describe("normalizeUrl", () => {
  it("prepends https:// when no protocol is present", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
  });

  it("preserves existing http protocol", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("preserves existing https protocol", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("preserves mailto protocol", () => {
    expect(normalizeUrl("mailto:test@example.com")).toBe("mailto:test@example.com");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeUrl("")).toBe("");
  });

  it("trims whitespace", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com");
  });
});

describe("isAllowedUrlScheme", () => {
  it("allows http:", () => {
    expect(isAllowedUrlScheme("http://example.com")).toBe(true);
  });

  it("allows https:", () => {
    expect(isAllowedUrlScheme("https://example.com")).toBe(true);
  });

  it("allows mailto:", () => {
    expect(isAllowedUrlScheme("mailto:test@example.com")).toBe(true);
  });

  it("blocks javascript:", () => {
    expect(isAllowedUrlScheme("javascript:alert(1)")).toBe(false);
  });

  it("blocks data:text/html", () => {
    expect(isAllowedUrlScheme("data:text/html,<script>alert(1)</script>")).toBe(false);
  });

  it("blocks ftp:", () => {
    expect(isAllowedUrlScheme("ftp://example.com")).toBe(false);
  });

  it("returns false for invalid URLs", () => {
    expect(isAllowedUrlScheme("not a url")).toBe(false);
  });
});

describe("sanitizeUrl", () => {
  it("normalizes and returns safe URLs", () => {
    expect(sanitizeUrl("example.com")).toBe("https://example.com");
  });

  it("returns empty string for javascript: URLs", () => {
    expect(sanitizeUrl("javascript:alert(1)")).toBe("");
  });

  it("returns empty string for data: URLs", () => {
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("");
  });
});
