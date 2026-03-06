import express, { type Request } from "express";
import type { RuntimeConfig } from "./config.js";
import { DiskSnapshotCache } from "./cache.js";
import { captureWebsite } from "./capture.js";
import type {
  CaptureRequestPayload,
  CaptureResponse,
  CapturedImageResult,
  ImageFormat
} from "./types.js";
import {
  assertTargetUrlAllowed,
  createSnapshotKey,
  normalizeTargetUrl,
  parseViewportDimension
} from "./url-policy.js";

const VALID_FORMATS = new Set<ImageFormat>(["png", "jpeg"]);
const DEFAULT_FORMAT: ImageFormat = "png";
const DEFAULT_QUALITY = 80;

function parseFormat(value: unknown): ImageFormat {
  if (typeof value === "string" && VALID_FORMATS.has(value as ImageFormat)) {
    return value as ImageFormat;
  }

  return DEFAULT_FORMAT;
}

function parseQuality(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_QUALITY;
  }

  return Math.min(100, Math.max(0, Math.floor(value)));
}

type CaptureFn = (options: {
  url: string;
  width: number;
  height: number;
  fullPage: boolean;
  format: ImageFormat;
  quality: number;
  navigationTimeoutMs: number;
}) => Promise<CapturedImageResult>;

export interface CreateAppOptions {
  config: RuntimeConfig;
  cache: DiskSnapshotCache;
  captureFn?: CaptureFn;
}

function buildAbsoluteImageUrl(request: Request, pathName: string): string {
  const proto = request.header("x-forwarded-proto") ?? request.protocol;
  const host = request.header("x-forwarded-host") ?? request.get("host");
  if (!host) {
    return pathName;
  }

  return `${proto}://${host}${pathName}`;
}

function toCaptureResponse(options: {
  key: string;
  sourceUrl: string;
  cached: boolean;
  capturedAtMs: number;
  ttlSeconds: number;
  mimeType: string;
  request: Request;
}): CaptureResponse {
  const imagePath = `/image/${options.key}`;
  const expiresAtMs = options.capturedAtMs + options.ttlSeconds * 1000;

  return {
    key: options.key,
    sourceUrl: options.sourceUrl,
    cached: options.cached,
    capturedAt: new Date(options.capturedAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
    ttlSeconds: options.ttlSeconds,
    mimeType: options.mimeType,
    imagePath,
    imageUrl: buildAbsoluteImageUrl(options.request, imagePath)
  };
}

function parseTtl(overrideTtl: unknown, fallback: number): number {
  if (typeof overrideTtl !== "number" || !Number.isFinite(overrideTtl)) {
    return fallback;
  }

  const rounded = Math.floor(overrideTtl);
  return rounded > 0 ? rounded : fallback;
}

function isAuthorized(request: Request, apiKey: string): boolean {
  const candidate = request.header("x-api-key");
  return Boolean(candidate) && candidate === apiKey;
}

export function createApp(options: CreateAppOptions) {
  const captureFn = options.captureFn ?? captureWebsite;
  const app = express();

  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.status(200).json({ ok: true });
  });

  app.use((request, response, next) => {
    if (isAuthorized(request, options.config.apiKey)) {
      next();
      return;
    }

    response.status(401).json({
      error: "Unauthorized. Provide a valid x-api-key header."
    });
  });

  app.post("/capture", async (request, response) => {
    try {
      const body = request.body as Partial<CaptureRequestPayload> | undefined;
      if (!body || typeof body.url !== "string" || body.url.trim().length === 0) {
        response.status(400).json({ error: "Body must include a valid url string." });
        return;
      }

      const sourceUrl = normalizeTargetUrl(body.url.trim());
      assertTargetUrlAllowed(sourceUrl, options.config);

      const width = parseViewportDimension(
        body.width,
        options.config.maxViewportWidth,
        options.config.maxViewportWidth
      );
      const height = parseViewportDimension(
        body.height,
        options.config.maxViewportHeight,
        options.config.maxViewportHeight
      );
      const fullPage = body.fullPage === true;
      const format = parseFormat(body.format);
      const quality = parseQuality(body.quality);
      const ttlSeconds = parseTtl(body.ttlOverrideSeconds, options.config.cacheTtlSeconds);

      const key = createSnapshotKey({ url: sourceUrl, width, height, fullPage, format, quality });
      const existing = await options.cache.getMeta(key);

      if (existing && options.cache.isFresh(existing, ttlSeconds)) {
        response
          .status(200)
          .json(
            toCaptureResponse({
              key,
              sourceUrl,
              cached: true,
              capturedAtMs: existing.capturedAt,
              ttlSeconds,
              mimeType: existing.contentType,
              request
            })
          );
        return;
      }

      const capturedAtMs = Date.now();
      const captured = await captureFn({
        url: sourceUrl,
        width,
        height,
        fullPage,
        format,
        quality,
        navigationTimeoutMs: options.config.navigationTimeoutMs
      });

      const saved = await options.cache.save({
        key,
        sourceUrl,
        format: captured.format,
        contentType: captured.contentType,
        buffer: captured.buffer,
        capturedAt: capturedAtMs
      });

      response
        .status(200)
        .json(
          toCaptureResponse({
            key,
            sourceUrl,
            cached: false,
            capturedAtMs: saved.capturedAt,
            ttlSeconds,
            mimeType: saved.contentType,
            request
          })
        );
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "Unable to capture screenshot."
      });
    }
  });

  app.post("/refresh", async (request, response) => {
    try {
      const body = request.body as Partial<CaptureRequestPayload> | undefined;
      if (!body || typeof body.url !== "string" || body.url.trim().length === 0) {
        response.status(400).json({ error: "Body must include a valid url string." });
        return;
      }

      const sourceUrl = normalizeTargetUrl(body.url.trim());
      assertTargetUrlAllowed(sourceUrl, options.config);

      const width = parseViewportDimension(
        body.width,
        options.config.maxViewportWidth,
        options.config.maxViewportWidth
      );
      const height = parseViewportDimension(
        body.height,
        options.config.maxViewportHeight,
        options.config.maxViewportHeight
      );
      const fullPage = body.fullPage === true;
      const format = parseFormat(body.format);
      const quality = parseQuality(body.quality);
      const ttlSeconds = parseTtl(body.ttlOverrideSeconds, options.config.cacheTtlSeconds);
      const key = createSnapshotKey({ url: sourceUrl, width, height, fullPage, format, quality });

      const capturedAtMs = Date.now();
      const captured = await captureFn({
        url: sourceUrl,
        width,
        height,
        fullPage,
        format,
        quality,
        navigationTimeoutMs: options.config.navigationTimeoutMs
      });

      const saved = await options.cache.save({
        key,
        sourceUrl,
        format: captured.format,
        contentType: captured.contentType,
        buffer: captured.buffer,
        capturedAt: capturedAtMs
      });

      response
        .status(200)
        .json(
          toCaptureResponse({
            key,
            sourceUrl,
            cached: false,
            capturedAtMs: saved.capturedAt,
            ttlSeconds,
            mimeType: saved.contentType,
            request
          })
        );
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : "Unable to refresh screenshot."
      });
    }
  });

  app.get("/image/:key", async (request, response) => {
    const key = request.params.key;
    if (!/^[a-f0-9]{24}$/.test(key)) {
      response.status(400).json({ error: "Invalid key format." });
      return;
    }

    const image = await options.cache.getImage(key);
    if (!image) {
      response.status(404).json({ error: "Screenshot not found." });
      return;
    }

    if (request.header("if-none-match") === image.meta.etag) {
      response.status(304).end();
      return;
    }

    response.setHeader("Content-Type", image.meta.contentType);
    response.setHeader("ETag", image.meta.etag);
    response.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    response.status(200).send(image.buffer);
  });

  return app;
}
