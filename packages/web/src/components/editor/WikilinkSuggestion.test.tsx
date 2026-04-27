import { describe, it, expect } from "vitest";
import { getWikilinkItems } from "./WikilinkSuggestion";
import type { NoteMetadata } from "@scratch-web/shared";

const mockNotes: NoteMetadata[] = [
  { id: "a", title: "Alpha Note", preview: "", modified: 1, version: { mtimeMs: 1, size: 1, sha256: "a" } },
  { id: "b", title: "Beta Note", preview: "", modified: 1, version: { mtimeMs: 1, size: 1, sha256: "b" } },
  { id: "c", title: "Gamma Note", preview: "", modified: 1, version: { mtimeMs: 1, size: 1, sha256: "c" } },
];

describe("WikilinkSuggestion", () => {
  it("returns notes for empty query", () => {
    const items = getWikilinkItems("", mockNotes);
    expect(items.length).toBe(3);
  });

  it("filters by title", () => {
    const items = getWikilinkItems("alp", mockNotes);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Alpha Note");
  });

  it("filters by id", () => {
    const items = getWikilinkItems("b", mockNotes);
    expect(items.length).toBe(1);
    expect(items[0].id).toBe("b");
  });

  it("strips leading brackets from query", () => {
    const items = getWikilinkItems("[[alp", mockNotes);
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Alpha Note");
  });

  it("limits results to 10", () => {
    const manyNotes = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      title: `Note ${i}`,
      preview: "",
      modified: 1,
      version: { mtimeMs: 1, size: 1, sha256: String(i) },
    }));
    const items = getWikilinkItems("", manyNotes);
    expect(items.length).toBe(10);
  });
});
