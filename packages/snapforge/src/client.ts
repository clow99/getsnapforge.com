import type {
  CaptureResponsePayload,
  SnapshotRequest,
  SnapshotResult,
  SnapforgeClientOptions
} from "./types.js";

interface RequestOptions {
  method: "GET" | "POST";
  path: string;
  body?: unknown;
}

export class SnapforgeClient {
  private readonly baseUrl: URL;
  private readonly apiKey: string;
  private readonly defaultTtlSeconds?: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: SnapforgeClientOptions) {
    if (!options.baseUrl) {
      throw new Error("baseUrl is required.");
    }

    if (!options.apiKey) {
      throw new Error("apiKey is required.");
    }

    this.baseUrl = new URL(options.baseUrl);
    this.apiKey = options.apiKey;
    this.defaultTtlSeconds = options.defaultTtlSeconds;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getSnapshot(request: SnapshotRequest): Promise<SnapshotResult> {
    if (!request.url) {
      throw new Error("request.url is required.");
    }

    const captureBody = {
      url: request.url,
      ttlOverrideSeconds: request.ttlOverrideSeconds ?? this.defaultTtlSeconds,
      width: request.width,
      height: request.height,
      fullPage: request.fullPage,
      format: request.format,
      quality: request.quality
    };

    const capture = await this.requestJson<CaptureResponsePayload>({
      method: "POST",
      path: "/capture",
      body: captureBody
    });

    const imageUrl = new URL(capture.imagePath, this.baseUrl);
    const imageResponse = await this.fetchImpl(imageUrl, {
      method: "GET",
      headers: {
        "x-api-key": this.apiKey
      }
    });

    if (!imageResponse.ok) {
      const body = await imageResponse.text();
      throw new Error(
        `Failed to fetch image (${imageResponse.status}): ${body || imageResponse.statusText}`
      );
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const dataUrl = this.toDataUrl(capture.mimeType, bytes);

    return {
      ...capture,
      bytes,
      dataUrl
    };
  }

  private async requestJson<T>(options: RequestOptions): Promise<T> {
    const url = new URL(options.path, this.baseUrl);

    const response = await this.fetchImpl(url, {
      method: options.method,
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Snapforge request failed (${response.status}): ${body || response.statusText}`
      );
    }

    return (await response.json()) as T;
  }

  private toDataUrl(mimeType: string, bytes: Uint8Array): string {
    const base64 = Buffer.from(bytes).toString("base64");
    return `data:${mimeType};base64,${base64}`;
  }
}

export function createSnapforgeClient(
  options: SnapforgeClientOptions
): SnapforgeClient {
  return new SnapforgeClient(options);
}
