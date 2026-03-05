import path from "node:path";

export interface RuntimeConfig {
  apiKey: string;
  port: number;
  cacheDir: string;
  cacheTtlSeconds: number;
  navigationTimeoutMs: number;
  maxViewportWidth: number;
  maxViewportHeight: number;
  urlAllowlist: Set<string>;
  urlDenylist: Set<string>;
}

const DEFAULT_CACHE_TTL_SECONDS = 300;
const DEFAULT_PORT = 4000;
const DEFAULT_NAVIGATION_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_VIEWPORT_WIDTH = 1920;
const DEFAULT_MAX_VIEWPORT_HEIGHT = 1080;

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function parseCsvSet(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const apiKey = env.SNAPFORGE_API_KEY;
  if (!apiKey) {
    throw new Error("SNAPFORGE_API_KEY is required.");
  }

  const cacheDir = env.CACHE_DIR
    ? path.resolve(env.CACHE_DIR)
    : path.resolve(process.cwd(), "cache");

  return {
    apiKey,
    port: parsePositiveInt(env.PORT, DEFAULT_PORT),
    cacheDir,
    cacheTtlSeconds: parsePositiveInt(env.CACHE_TTL_SECONDS, DEFAULT_CACHE_TTL_SECONDS),
    navigationTimeoutMs: parsePositiveInt(
      env.NAVIGATION_TIMEOUT_MS,
      DEFAULT_NAVIGATION_TIMEOUT_MS
    ),
    maxViewportWidth: parsePositiveInt(env.MAX_VIEWPORT_WIDTH, DEFAULT_MAX_VIEWPORT_WIDTH),
    maxViewportHeight: parsePositiveInt(env.MAX_VIEWPORT_HEIGHT, DEFAULT_MAX_VIEWPORT_HEIGHT),
    urlAllowlist: parseCsvSet(env.URL_ALLOWLIST),
    urlDenylist: parseCsvSet(env.URL_DENYLIST)
  };
}
