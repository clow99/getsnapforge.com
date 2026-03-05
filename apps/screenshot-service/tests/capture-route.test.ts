import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { DiskSnapshotCache } from "../src/cache.js";
import type { RuntimeConfig } from "../src/config.js";

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

async function createTestDependencies() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "snapforge-service-test-"));
  tempDirs.push(dir);
  const cache = new DiskSnapshotCache(dir);
  await cache.init();

  const config: RuntimeConfig = {
    apiKey: "test-key",
    cacheDir: dir,
    cacheTtlSeconds: 60,
    navigationTimeoutMs: 5_000,
    maxViewportWidth: 1920,
    maxViewportHeight: 1080,
    port: 4000,
    urlAllowlist: new Set(),
    urlDenylist: new Set()
  };

  return { cache, config };
}

describe("capture endpoint", () => {
  it("captures once and serves cached metadata until ttl expires", async () => {
    const { cache, config } = await createTestDependencies();
    let captureCount = 0;

    const app = createApp({
      cache,
      config,
      captureFn: async () => {
        captureCount += 1;
        return {
          buffer: Buffer.from(`image-${captureCount}`),
          format: "png",
          contentType: "image/png"
        };
      }
    });

    const first = await request(app)
      .post("/capture")
      .set("x-api-key", "test-key")
      .send({ url: "https://example.com" });

    expect(first.status).toBe(200);
    expect(first.body.cached).toBe(false);
    expect(captureCount).toBe(1);

    const second = await request(app)
      .post("/capture")
      .set("x-api-key", "test-key")
      .send({ url: "https://example.com" });

    expect(second.status).toBe(200);
    expect(second.body.cached).toBe(true);
    expect(captureCount).toBe(1);

    const image = await request(app)
      .get(`/image/${first.body.key}`)
      .set("x-api-key", "test-key");

    expect(image.status).toBe(200);
    expect(image.header["content-type"]).toContain("image/png");
    expect(Buffer.isBuffer(image.body)).toBe(true);
    expect(image.body.toString("utf8")).toContain("image-1");
  });

  it("rejects requests without API key", async () => {
    const { cache, config } = await createTestDependencies();
    const app = createApp({ cache, config });

    const response = await request(app).post("/capture").send({ url: "https://example.com" });
    expect(response.status).toBe(401);
  });
});
