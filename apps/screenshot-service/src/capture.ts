import type { Browser } from "playwright";
import { chromium } from "playwright";
import type { CapturedImageResult, ImageFormat } from "./types.js";

const CONTENT_TYPES: Record<ImageFormat, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp"
};

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }

  return browserPromise;
}

export async function captureWebsite(options: {
  url: string;
  width: number;
  height: number;
  fullPage: boolean;
  format: ImageFormat;
  quality: number;
  navigationTimeoutMs: number;
}): Promise<CapturedImageResult> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    viewport: { width: options.width, height: options.height }
  });

  try {
    const page = await context.newPage();
    await page.goto(options.url, {
      timeout: options.navigationTimeoutMs,
      waitUntil: "networkidle"
    });

    const buffer = await page.screenshot({
      type: options.format,
      quality: options.format !== "png" ? options.quality : undefined,
      fullPage: options.fullPage
    });

    return {
      buffer,
      format: options.format,
      contentType: CONTENT_TYPES[options.format]
    };
  } finally {
    await context.close();
  }
}

export async function closeCaptureBrowser(): Promise<void> {
  if (!browserPromise) {
    return;
  }

  const browser = await browserPromise;
  await browser.close();
  browserPromise = null;
}
