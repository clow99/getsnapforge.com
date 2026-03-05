import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DiskSnapshotCache } from "../src/cache.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function createTempCache(): Promise<DiskSnapshotCache> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "snapforge-cache-"));
  tempDirs.push(dir);
  const cache = new DiskSnapshotCache(dir);
  await cache.init();
  return cache;
}

describe("DiskSnapshotCache", () => {
  it("stores metadata and image bytes", async () => {
    const cache = await createTempCache();
    const payload = Buffer.from("sample-image-bytes");

    await cache.save({
      key: "abc123abc123abc123abc123",
      sourceUrl: "https://example.com/",
      format: "png",
      contentType: "image/png",
      buffer: payload,
      capturedAt: Date.now()
    });

    const meta = await cache.getMeta("abc123abc123abc123abc123");
    expect(meta).not.toBeNull();
    expect(meta?.sizeBytes).toBe(payload.byteLength);

    const image = await cache.getImage("abc123abc123abc123abc123");
    expect(image).not.toBeNull();
    expect(image?.buffer.equals(payload)).toBe(true);
  });

  it("evaluates freshness based on ttl", async () => {
    const cache = await createTempCache();

    const meta = await cache.save({
      key: "fff111fff111fff111fff111",
      sourceUrl: "https://example.com/",
      format: "png",
      contentType: "image/png",
      buffer: Buffer.from("data"),
      capturedAt: 1_000
    });

    expect(cache.isFresh(meta, 3, 3_500)).toBe(true);
    expect(cache.isFresh(meta, 3, 4_100)).toBe(false);
  });
});
