import crypto from "node:crypto";
import type { RuntimeConfig } from "./config.js";
import type { ImageFormat } from "./types.js";

export function normalizeTargetUrl(value: string): string {
  const parsed = new URL(value);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  parsed.hash = "";
  return parsed.toString();
}

export function assertTargetUrlAllowed(url: string, config: RuntimeConfig): void {
  const hostname = new URL(url).hostname.toLowerCase();

  if (config.urlDenylist.has(hostname)) {
    throw new Error(`Hostname ${hostname} is denied by policy.`);
  }

  if (config.urlAllowlist.size > 0 && !config.urlAllowlist.has(hostname)) {
    throw new Error(`Hostname ${hostname} is not in URL_ALLOWLIST.`);
  }
}

export function createSnapshotKey(options: {
  url: string;
  width: number;
  height: number;
  fullPage: boolean;
  format: ImageFormat;
  quality: number;
}): string {
  const input = `${options.url}|${options.width}x${options.height}|${options.fullPage ? "full" : "viewport"}|${options.format}@${options.quality}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 24);
}

export function parseViewportDimension(
  value: unknown,
  fallback: number,
  max: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  const rounded = Math.floor(value);
  if (rounded <= 0) {
    return fallback;
  }

  return Math.min(rounded, max);
}
