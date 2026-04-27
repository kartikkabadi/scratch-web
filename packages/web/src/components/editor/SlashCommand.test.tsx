import { describe, it, expect } from "vitest";
import { getSlashItems } from "./SlashCommand";

describe("SlashCommand", () => {
  it("returns all items for empty query", () => {
    const items = getSlashItems("");
    expect(items.length).toBeGreaterThan(0);
    expect(items.some((i) => i.title === "Heading 1")).toBe(true);
  });

  it("filters items by query", () => {
    const items = getSlashItems("code");
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((i) => i.title.toLowerCase().includes("code"))).toBe(true);
  });

  it("returns empty for non-matching query", () => {
    const items = getSlashItems("xyz");
    expect(items.length).toBe(0);
  });

  it("includes headings, lists, and blocks", () => {
    const items = getSlashItems("");
    const titles = items.map((i) => i.title);
    expect(titles).toContain("Heading 1");
    expect(titles).toContain("Bullet List");
    expect(titles).toContain("Code Block");
    expect(titles).toContain("Table");
    expect(titles).toContain("Wikilink");
  });
});
