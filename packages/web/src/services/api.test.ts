import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as api from "./api";

describe("api client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists notes", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify([{ id: "test", title: "Test", preview: "", modified: 1, version: { mtimeMs: 1, size: 1, sha256: "a" } }]), { status: 200 }),
    );
    const result = await api.listNotes();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("test");
  });

  it("throws on error response", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Missing" } }), { status: 404 }),
    );
    await expect(api.readNote("missing")).rejects.toThrow("Missing");
  });

  it("throws with status for conflict", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "CONFLICT", message: "Changed" } }), { status: 409 }),
    );
    try {
      await api.saveNote("id", "content", { mtimeMs: 1, size: 1, sha256: "a" });
      expect.fail("should throw");
    } catch (err) {
      expect((err as Error & { status?: number }).status).toBe(409);
    }
  });

  it("sends JSON content type for bodyless mutations", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    await api.deleteNote("id");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/notes/id",
      expect.objectContaining({
        method: "DELETE",
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("calls Git status and asset import endpoints", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ available: true, initialized: true, branch: "main", upstream: null, ahead: 0, behind: 0, clean: true, entries: [] }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ path: "assets/a.png", url: "/api/assets/a.png", filename: "a.png", mimeType: "image/png", size: 8 }), {
          status: 201,
        }),
      );

    await expect(api.getGitStatus()).resolves.toMatchObject({ initialized: true });
    await expect(api.importAsset({ filename: "a.png", mimeType: "image/png", dataBase64: "abc" })).resolves.toMatchObject({
      path: "assets/a.png",
    });

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      "/api/assets/import",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
      }),
    );
  });
});
