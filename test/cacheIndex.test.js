import { describe, it, expect, vi } from "vitest";
import { loadPhotosIndex, savePhotosIndex } from "../src/cache/photosIndex.js";
import fs from "node:fs/promises";

const TMP = "./cache/test-photos-index.json";

describe("photos index cache", () => {
  it("expires after TTL", async () => {
    process.env.PHOTOS_INDEX_PATH = TMP;
    const now = new Date("2025-01-01T00:00:00Z");
    vi.setSystemTime(now);

    await savePhotosIndex({ built_at: now.toISOString(), ttl_seconds: 10, buckets: {} });
    expect(await loadPhotosIndex()).not.toBeNull();

    vi.setSystemTime(new Date(now.getTime() + 11_000));
    expect(await loadPhotosIndex()).toBeNull();

    await fs.rm(TMP, { force: true });
  });
});
