export type ImageFormat = "png" | "jpeg";

export type SnapshotPreset = "1080p" | "720p" | "4k";

export interface PresetConfig {
  width: number;
  height: number;
  fullPage: boolean;
}

export const SNAPSHOT_PRESETS: Record<SnapshotPreset, PresetConfig> = {
  "1080p": { width: 1920, height: 1080, fullPage: false },
  "720p": { width: 1280, height: 720, fullPage: false },
  "4k": { width: 3840, height: 2160, fullPage: false }
};

export interface SnapforgeClientOptions {
  baseUrl: string;
  apiKey: string;
  defaultTtlSeconds?: number;
  fetchImpl?: typeof fetch;
}

export interface SnapshotRequest {
  url: string;
  /** Use a named preset to set width, height, and fullPage automatically. Explicit values override the preset. */
  preset?: SnapshotPreset;
  ttlOverrideSeconds?: number;
  width?: number;
  height?: number;
  fullPage?: boolean;
  format?: ImageFormat;
  quality?: number;
}

export interface CaptureResponsePayload {
  key: string;
  sourceUrl: string;
  cached: boolean;
  capturedAt: string;
  expiresAt: string;
  ttlSeconds: number;
  mimeType: string;
  imagePath: string;
  imageUrl: string;
}

export interface SnapshotResult extends CaptureResponsePayload {
  bytes: Uint8Array;
  dataUrl: string;
}
