export type ImageFormat = "png" | "jpeg" | "webp";

export interface CaptureRequestPayload {
  url: string;
  ttlOverrideSeconds?: number;
  width?: number;
  height?: number;
  fullPage?: boolean;
  format?: ImageFormat;
  quality?: number;
}

export interface SnapshotMeta {
  key: string;
  sourceUrl: string;
  fileName: string;
  format: ImageFormat;
  contentType: string;
  sizeBytes: number;
  capturedAt: number;
  etag: string;
}

export interface CapturedImageResult {
  buffer: Buffer;
  format: ImageFormat;
  contentType: string;
}

export interface CaptureResponse {
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
