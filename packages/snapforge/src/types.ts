export type ImageFormat = "png" | "jpeg";

export interface SnapforgeClientOptions {
  baseUrl: string;
  apiKey: string;
  defaultTtlSeconds?: number;
  fetchImpl?: typeof fetch;
}

export interface SnapshotRequest {
  url: string;
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
