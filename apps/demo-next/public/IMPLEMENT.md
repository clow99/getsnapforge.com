# Implementing @npmforge/snapforge — AI Agent Guide

> This document is a step-by-step guide designed for AI coding agents.
> Follow each section in order to integrate the Snapforge screenshot SDK into a project.

---

## 1. Overview

`@npmforge/snapforge` is a TypeScript client for a self-hosted screenshot service.
It captures any URL via a headless browser, caches results on disk, and returns a
typed `SnapshotResult` containing a base64 data URL and raw bytes.

**Key traits:**

- Zero runtime dependencies (uses native `fetch` + Node `Buffer`)
- Fully typed — every request and response has a TypeScript interface
- Works in Node.js, Next.js RSC, Express, Hono, and edge runtimes

---

## 2. Prerequisites

Before writing any code, confirm the following are available:

| Requirement | Details |
|---|---|
| **Node.js** | >= 18 (needs native `fetch`) |
| **Snapforge service** | A running instance of the screenshot service (Docker or bare-metal). Default port: `4000`. |
| **API key** | The service requires an `x-api-key` header. The key is set via the `SNAPFORGE_API_KEY` env var on the service. |

### Deploying the screenshot service (Docker)

```bash
# Clone the monorepo
git clone https://github.com/npmforge/snapforge.git
cd snapforge

# Copy env and set your API key
cp .env.example .env
# Edit .env → set SNAPFORGE_API_KEY to a strong random string

# Start the service
docker compose up -d
```

The service exposes:

- `POST /capture` — triggers a screenshot and returns metadata
- `GET /screenshots/<key>.<ext>` — serves the cached image

You do **not** call these directly — the SDK handles both calls internally.

---

## 3. Install the package

```bash
npm install @npmforge/snapforge
```

---

## 4. Environment variables

Add these to your `.env` (or equivalent):

```env
SNAPFORGE_SERVICE_URL=http://localhost:4000
SNAPFORGE_API_KEY=your-api-key-here
```

---

## 5. Create the client

```typescript
import { createSnapforgeClient } from "@npmforge/snapforge";

const client = createSnapforgeClient({
  baseUrl: process.env.SNAPFORGE_SERVICE_URL!,
  apiKey: process.env.SNAPFORGE_API_KEY!,
  // Optional: default cache TTL for all requests (seconds)
  defaultTtlSeconds: 300,
});
```

### Client options reference

```typescript
interface SnapforgeClientOptions {
  baseUrl: string;            // URL of the screenshot service
  apiKey: string;             // API key for authentication
  defaultTtlSeconds?: number; // Default cache TTL (can be overridden per-request)
  fetchImpl?: typeof fetch;   // Custom fetch implementation (defaults to global fetch)
}
```

---

## 6. Capture a screenshot

```typescript
const snapshot = await client.getSnapshot({
  url: "https://example.com",
});

// Use the result
console.log(snapshot.dataUrl);    // "data:image/png;base64,..."
console.log(snapshot.cached);     // true | false
console.log(snapshot.capturedAt); // "2024-01-15T10:30:00.000Z"
```

### Request options reference

```typescript
interface SnapshotRequest {
  url: string;                   // Required — the URL to capture
  preset?: "1080p" | "720p" | "4k"; // Named viewport preset
  width?: number;                // Viewport width (overrides preset)
  height?: number;               // Viewport height (overrides preset)
  fullPage?: boolean;            // Capture full scrollable page
  format?: "png" | "jpeg";      // Image format
  quality?: number;              // JPEG quality (1-100)
  ttlOverrideSeconds?: number;   // Override cache TTL for this request
}
```

### Preset values

| Preset | Width | Height | Full page |
|--------|-------|--------|-----------|
| `1080p` | 1920 | 1080 | false |
| `720p` | 1280 | 720 | false |
| `4k` | 3840 | 2160 | false |

---

## 7. Response shape — `SnapshotResult`

Every `getSnapshot()` call returns the same typed object:

```typescript
interface SnapshotResult {
  dataUrl: string;      // Base64-encoded image ready for <img src="">
  bytes: Uint8Array;    // Raw image bytes for custom processing or storage
  cached: boolean;      // Whether the result came from disk cache
  capturedAt: string;   // ISO timestamp of capture
  expiresAt: string;    // ISO timestamp of cache expiry
  ttlSeconds: number;   // Cache duration that was applied
  mimeType: string;     // "image/png" or "image/jpeg"
  sourceUrl: string;    // The URL that was captured
  key: string;          // Internal cache key
  imagePath: string;    // Relative path to the image on the service
  imageUrl: string;     // Full URL to the image on the service
}
```

---

## 8. Integration patterns

### Next.js App Router (Server Component)

```typescript
// app/page.tsx
import { createSnapforgeClient } from "@npmforge/snapforge";

const client = createSnapforgeClient({
  baseUrl: process.env.SNAPFORGE_SERVICE_URL!,
  apiKey: process.env.SNAPFORGE_API_KEY!,
});

export default async function Page() {
  const snapshot = await client.getSnapshot({
    url: "https://example.com",
    preset: "1080p",
  });

  return (
    <div>
      <img src={snapshot.dataUrl} alt="Screenshot" />
      <p>Cached: {snapshot.cached ? "Yes" : "No"}</p>
      <p>Captured at: {snapshot.capturedAt}</p>
    </div>
  );
}
```

### Next.js API Route

```typescript
// app/api/screenshot/route.ts
import { createSnapforgeClient } from "@npmforge/snapforge";
import { NextRequest, NextResponse } from "next/server";

const client = createSnapforgeClient({
  baseUrl: process.env.SNAPFORGE_SERVICE_URL!,
  apiKey: process.env.SNAPFORGE_API_KEY!,
});

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  const snapshot = await client.getSnapshot({ url, preset: "1080p" });

  return NextResponse.json({
    dataUrl: snapshot.dataUrl,
    cached: snapshot.cached,
    capturedAt: snapshot.capturedAt,
    expiresAt: snapshot.expiresAt,
  });
}
```

### Express

```typescript
import express from "express";
import { createSnapforgeClient } from "@npmforge/snapforge";

const app = express();
const client = createSnapforgeClient({
  baseUrl: process.env.SNAPFORGE_SERVICE_URL!,
  apiKey: process.env.SNAPFORGE_API_KEY!,
  defaultTtlSeconds: 600,
});

app.get("/screenshot", async (req, res) => {
  const { url } = req.query;
  if (typeof url !== "string") {
    return res.status(400).json({ error: "url query param required" });
  }

  const snapshot = await client.getSnapshot({
    url,
    preset: "1080p",
    fullPage: false,
  });

  res.json({
    dataUrl: snapshot.dataUrl,
    cached: snapshot.cached,
    capturedAt: snapshot.capturedAt,
  });
});

app.listen(3000);
```

### Hono

```typescript
import { Hono } from "hono";
import { createSnapforgeClient } from "@npmforge/snapforge";

const app = new Hono();
const client = createSnapforgeClient({
  baseUrl: process.env.SNAPFORGE_SERVICE_URL!,
  apiKey: process.env.SNAPFORGE_API_KEY!,
});

app.get("/screenshot", async (c) => {
  const url = c.req.query("url");
  if (!url) return c.json({ error: "url required" }, 400);

  const snapshot = await client.getSnapshot({ url, preset: "1080p" });

  return c.json({
    dataUrl: snapshot.dataUrl,
    cached: snapshot.cached,
    capturedAt: snapshot.capturedAt,
  });
});

export default app;
```

### Saving to disk (Node.js)

```typescript
import { writeFile } from "node:fs/promises";
import { createSnapforgeClient } from "@npmforge/snapforge";

const client = createSnapforgeClient({
  baseUrl: process.env.SNAPFORGE_SERVICE_URL!,
  apiKey: process.env.SNAPFORGE_API_KEY!,
});

const snapshot = await client.getSnapshot({
  url: "https://example.com",
  format: "jpeg",
  quality: 85,
  fullPage: true,
  width: 1440,
});

await writeFile("screenshot.jpg", snapshot.bytes);
console.log(`Saved ${snapshot.bytes.length} bytes to screenshot.jpg`);
```

---

## 9. Error handling

The client throws standard `Error` objects. Wrap calls in try/catch:

```typescript
try {
  const snapshot = await client.getSnapshot({ url: "https://example.com" });
} catch (error) {
  if (error instanceof Error) {
    // Common errors:
    // - "baseUrl is required."
    // - "apiKey is required."
    // - "request.url is required."
    // - "Snapforge request failed (401): Unauthorized"
    // - "Snapforge request failed (500): ..."
    // - "Failed to fetch image (404): ..."
    console.error("Snapforge error:", error.message);
  }
}
```

---

## 10. Common recipes

### Conditional refresh based on cache expiry

```typescript
const snapshot = await client.getSnapshot({
  url: "https://example.com",
  ttlOverrideSeconds: 120,
});

if (snapshot.cached) {
  const expiresAt = new Date(snapshot.expiresAt);
  const msUntilExpiry = expiresAt.getTime() - Date.now();
  if (msUntilExpiry < 30_000) {
    // Cache is about to expire — schedule a refresh
    setTimeout(() => refreshScreenshot(), msUntilExpiry);
  }
}
```

### Multiple screenshots in parallel

```typescript
const urls = [
  "https://vercel.com",
  "https://github.com",
  "https://example.com",
];

const snapshots = await Promise.all(
  urls.map((url) =>
    client.getSnapshot({ url, preset: "1080p", ttlOverrideSeconds: 300 })
  )
);

for (const snap of snapshots) {
  console.log(`${snap.sourceUrl}: cached=${snap.cached}`);
}
```

### Custom fetch implementation

```typescript
import { createSnapforgeClient } from "@npmforge/snapforge";

const client = createSnapforgeClient({
  baseUrl: process.env.SNAPFORGE_SERVICE_URL!,
  apiKey: process.env.SNAPFORGE_API_KEY!,
  fetchImpl: async (input, init) => {
    console.log(`[snapforge] ${init?.method ?? "GET"} ${input}`);
    return fetch(input, init);
  },
});
```

---

## 11. Checklist

Use this checklist to verify the integration is complete:

- [ ] Screenshot service is running and reachable at `baseUrl`
- [ ] `SNAPFORGE_SERVICE_URL` and `SNAPFORGE_API_KEY` env vars are set
- [ ] `@npmforge/snapforge` is installed
- [ ] Client is created with `createSnapforgeClient()`
- [ ] `getSnapshot()` is called with at least a `url`
- [ ] `snapshot.dataUrl` is used to render the image (e.g., `<img src={snapshot.dataUrl}>`)
- [ ] Error handling is in place (try/catch around `getSnapshot`)
- [ ] Cache behavior is verified (`snapshot.cached` returns `true` on repeat requests)

---

## 12. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `baseUrl is required` | Missing env var | Set `SNAPFORGE_SERVICE_URL` |
| `apiKey is required` | Missing env var | Set `SNAPFORGE_API_KEY` |
| `401 Unauthorized` | API key mismatch | Ensure the key matches what the service expects |
| `ECONNREFUSED` | Service not running | Start the service with `docker compose up -d` |
| `500` on capture | Service-side error | Check screenshot-service logs (`docker logs snapforge`) |
| Stale screenshots | TTL too long | Lower `ttlOverrideSeconds` or `defaultTtlSeconds` |
| Large response size | Full-page PNG | Use `format: "jpeg"` with `quality: 80`, or avoid `fullPage: true` |

---

## 13. TypeScript exports summary

```typescript
// Functions
export function createSnapforgeClient(options: SnapforgeClientOptions): SnapforgeClient;

// Classes
export class SnapforgeClient {
  constructor(options: SnapforgeClientOptions);
  getSnapshot(request: SnapshotRequest): Promise<SnapshotResult>;
}

// Constants
export const SNAPSHOT_PRESETS: Record<SnapshotPreset, PresetConfig>;

// Types
export type ImageFormat = "png" | "jpeg";
export type SnapshotPreset = "1080p" | "720p" | "4k";
export interface PresetConfig { width: number; height: number; fullPage: boolean; }
export interface SnapforgeClientOptions { baseUrl: string; apiKey: string; defaultTtlSeconds?: number; fetchImpl?: typeof fetch; }
export interface SnapshotRequest { url: string; preset?: SnapshotPreset; ttlOverrideSeconds?: number; width?: number; height?: number; fullPage?: boolean; format?: ImageFormat; quality?: number; }
export interface SnapshotResult extends CaptureResponsePayload { bytes: Uint8Array; dataUrl: string; }
export interface CaptureResponsePayload { key: string; sourceUrl: string; cached: boolean; capturedAt: string; expiresAt: string; ttlSeconds: number; mimeType: string; imagePath: string; imageUrl: string; }
```
