# Snapforge Monorepo

Self-hosted website screenshot tooling with:

- A TypeScript SDK: `@npmforge/snapforge`
- A Playwright-powered screenshot API service
- A Next.js demo app that renders live snapshots

This repo is organized as an npm workspaces monorepo and targets Node.js 20+.

## Table of contents

- [What this project does](#what-this-project-does)
- [Architecture](#architecture)
- [Monorepo structure](#monorepo-structure)
- [Requirements](#requirements)
- [Quick start (local)](#quick-start-local)
- [Environment variables](#environment-variables)
- [Run with Docker Compose](#run-with-docker-compose)
- [Screenshot service API](#screenshot-service-api)
- [SDK usage (`@npmforge/snapforge`)](#sdk-usage-npmforgesnapforge)
- [Development commands](#development-commands)
- [Testing](#testing)
- [Publishing](#publishing)
- [Troubleshooting](#troubleshooting)

## What this project does

Snapforge captures screenshots of target URLs, caches image output on disk, and returns metadata plus retrievable images. The SDK wraps the API with a simple `getSnapshot()` call and returns both raw image bytes and a base64 data URL for immediate rendering.

Core behavior:

- API-key protected service (`x-api-key`)
- Request-level screenshot controls (viewport, format, quality, full page)
- TTL-based disk cache to avoid repeated browser captures
- Hostname allowlist/denylist controls for request policy
- Typed SDK surface for Node/TypeScript integrations

## Architecture

1. Your app calls `createSnapforgeClient(...).getSnapshot(...)`.
2. SDK sends `POST /capture` to the screenshot service.
3. Service normalizes and validates URL policy rules.
4. Service checks disk cache by deterministic key.
5. If fresh, metadata is returned as cache hit.
6. If stale/missing, service captures with Playwright, persists image+metadata, then returns response.
7. SDK fetches `GET /image/:key`, converts bytes to `data:<mime>;base64,...`, and returns the full typed result.

## Monorepo structure

```text
.
├─ apps/
│  ├─ screenshot-service/   # Express + Playwright API server
│  └─ demo-next/            # Next.js demo site using the SDK
├─ packages/
│  └─ snapforge/            # Published TypeScript SDK (@npmforge/snapforge)
├─ docker-compose.yml       # Service + optional demo compose setup
├─ Dockerfile               # Demo app image
└─ .github/workflows/       # Publish automation
```

## Requirements

- Node.js `>=20`
- npm
- Docker and Docker Compose (optional, for containerized runs)

## Quick start (local)

### 1) Install dependencies

```bash
npm ci
```

### 2) Configure screenshot service env

Create `apps/screenshot-service/.env` from `apps/screenshot-service/.env.example`:

```env
SNAPFORGE_API_KEY=replace-with-strong-api-key
PORT=4000
CACHE_DIR=/app/cache
CACHE_TTL_SECONDS=300
NAVIGATION_TIMEOUT_MS=15000
MAX_VIEWPORT_WIDTH=1920
MAX_VIEWPORT_HEIGHT=1080
# URL_ALLOWLIST=example.com,vercel.com
# URL_DENYLIST=internal.example.com
```

For local (non-container) development, set `CACHE_DIR` to a local writable path if desired (for example `./cache`).

### 3) Start screenshot service

```bash
npm run dev:service
```

Service runs on `http://localhost:4000` by default.

### 4) Configure demo app env (optional)

Create `apps/demo-next/.env.local` from `apps/demo-next/.env.example`:

```env
SNAPFORGE_SERVICE_URL=http://localhost:4000
SNAPFORGE_API_KEY=replace-with-your-api-key
```

### 5) Start demo app

```bash
npm run dev:demo
```

Demo runs on `http://localhost:3000` (Next.js default).

## Environment variables

### Screenshot service (`apps/screenshot-service`)

- `SNAPFORGE_API_KEY` (required): Shared secret expected in `x-api-key`
- `PORT` (default `4000`): Service listen port
- `CACHE_DIR` (default `<cwd>/cache`): Cache storage directory
- `CACHE_TTL_SECONDS` (default `300`): Cache freshness window
- `NAVIGATION_TIMEOUT_MS` (default `15000`): Playwright `page.goto` timeout
- `MAX_VIEWPORT_WIDTH` (default `1920`): Upper bound for requested width
- `MAX_VIEWPORT_HEIGHT` (default `1080`): Upper bound for requested height
- `URL_ALLOWLIST` (optional): Comma-separated hostnames allowed (if set, only these pass)
- `URL_DENYLIST` (optional): Comma-separated hostnames always blocked

### Demo app (`apps/demo-next`)

- `SNAPFORGE_SERVICE_URL` (required for live snapshots): Service base URL
- `SNAPFORGE_API_KEY` (required for live snapshots): Matching API key

### Root `.env.example`

The root `.env.example` is primarily for Docker Compose and convenience defaults.

## Run with Docker Compose

Default service-only run:

```bash
docker compose up --build
```

This starts:

- `snapforge` service on `${SERVICE_PORT:-4000}`
- a persistent cache volume (`snapforge-cache`)

To include demo app too:

```bash
docker compose --profile demo up --build
```

Demo container defaults to `${WEB_PORT:-3000}`.

Important compose variables:

- `SNAPFORGE_API_KEY` (required)
- `SERVICE_PORT` (default `4000`)
- `WEB_PORT` (default `3000`, demo profile)
- `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_APP_NAME` (demo build args)

## Screenshot service API

All endpoints except `/health` require header:

```http
x-api-key: <your-api-key>
```

### `GET /health`

Health check.

Response:

```json
{ "ok": true }
```

### `POST /capture`

Captures URL if cache miss/stale, otherwise returns cached metadata.

Request body:

```json
{
  "url": "https://example.com",
  "ttlOverrideSeconds": 300,
  "width": 1440,
  "height": 900,
  "fullPage": true,
  "format": "png",
  "quality": 80
}
```

Response shape:

```json
{
  "key": "abc123...",
  "sourceUrl": "https://example.com/",
  "cached": false,
  "capturedAt": "2026-01-01T00:00:00.000Z",
  "expiresAt": "2026-01-01T00:05:00.000Z",
  "ttlSeconds": 300,
  "mimeType": "image/png",
  "imagePath": "/image/abc123...",
  "imageUrl": "http://localhost:4000/image/abc123..."
}
```

### `POST /refresh`

Same payload as `/capture`, but always re-captures and overwrites cache for that key.

### `GET /image/:key`

Returns image bytes for a 24-char hex key.

- `200`: Binary image body
- `304`: If `If-None-Match` matches current ETag
- `404`: Not found

### Example cURL flow

```bash
curl -sS -X POST "http://localhost:4000/capture" \
  -H "content-type: application/json" \
  -H "x-api-key: $SNAPFORGE_API_KEY" \
  -d '{"url":"https://example.com","fullPage":true,"width":1280,"height":800}' \
  | jq
```

Then fetch image:

```bash
curl -sS "http://localhost:4000/image/<key>" \
  -H "x-api-key: $SNAPFORGE_API_KEY" \
  --output snapshot.png
```

## SDK usage (`@npmforge/snapforge`)

Install:

```bash
npm i @npmforge/snapforge
```

Example:

```ts
import { createSnapforgeClient } from "@npmforge/snapforge";

const client = createSnapforgeClient({
  baseUrl: "http://localhost:4000",
  apiKey: process.env.SNAPFORGE_API_KEY!,
  defaultTtlSeconds: 300
});

const snapshot = await client.getSnapshot({
  url: "https://example.com",
  fullPage: true,
  width: 1440,
  height: 900,
  format: "png"
});

console.log(snapshot.cached, snapshot.expiresAt);
console.log(snapshot.dataUrl); // ready for <img src=...>
```

`SnapshotResult` includes:

- `bytes: Uint8Array`
- `dataUrl: string`
- response metadata (`cached`, `capturedAt`, `expiresAt`, `mimeType`, etc.)

## Development commands

From repo root:

- `npm run build` - build all workspaces where build script exists
- `npm run lint` - run workspace lint scripts
- `npm run test` - run workspace test scripts
- `npm run typecheck` - run workspace typechecks
- `npm run dev:service` - start screenshot service in watch mode
- `npm run dev:demo` - start Next.js demo app

Package-specific examples:

- `npm -w @getsnapforge/screenshot-service run test`
- `npm -w @npmforge/snapforge run build`

## Testing

Current tests live in `apps/screenshot-service/tests` and cover:

- cache persistence/freshness logic
- capture route authorization and cache-hit behavior

Run service tests:

```bash
npm -w @getsnapforge/screenshot-service run test
```

## Publishing

CI workflows publish the SDK package from `packages/snapforge`:

- `.github/workflows/publish-npmjs.yml`
  - publishes `@npmforge/snapforge` to npmjs
  - skips publish if current version already exists
  - uses `NPM_TOKEN`
- `.github/workflows/publish-npm.yml`
  - publishes to GitHub Packages
  - normalizes scope to `@<repo-owner>/<package-name>`
  - authenticates with `GITHUB_TOKEN`

Before release:

1. Bump `packages/snapforge/package.json` version
2. Merge to `main`
3. Confirm workflow run and package visibility

## Troubleshooting

- `401 Unauthorized`: Ensure client sends `x-api-key` matching service `SNAPFORGE_API_KEY`.
- `Hostname ... is not in URL_ALLOWLIST`: Add target host to `URL_ALLOWLIST` or remove allowlist restriction.
- Slow captures/timeouts: Increase `NAVIGATION_TIMEOUT_MS` and verify target site accessibility.
- Empty demo snapshots: Check `apps/demo-next` env values for `SNAPFORGE_SERVICE_URL` and `SNAPFORGE_API_KEY`.
- Docker service starts but no captures: Verify `SNAPFORGE_API_KEY` is set in compose environment.

