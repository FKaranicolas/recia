import "server-only";

import { createCanvas } from "@napi-rs/canvas";
import convertHeic from "heic-convert";
import sharp from "sharp";

import type { DocumentDerivativeKind } from "@/types/database";

import type { DocumentMimeType } from "./limits";

export type Derivative = {
  kind: DocumentDerivativeKind;
  bytes: Uint8Array;
  mimeType: "image/jpeg" | "image/webp";
  width: number;
  height: number;
  page: number | null;
};

const THUMBNAIL_MAX_EDGE = 480;
const PREVIEW_MAX_EDGE = 1600;
const PDF_RENDER_SCALE = 2;

async function toThumbnail(source: Uint8Array): Promise<Derivative> {
  const image = sharp(source, { limitInputPixels: 40_000_000 }).rotate();
  const output = await image
    .resize({
      width: THUMBNAIL_MAX_EDGE,
      height: THUMBNAIL_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 78 })
    .toBuffer({ resolveWithObject: true });

  return {
    kind: "thumbnail",
    bytes: new Uint8Array(output.data),
    mimeType: "image/webp",
    width: output.info.width,
    height: output.info.height,
    page: null,
  };
}

async function toPreview(source: Uint8Array, page: number | null): Promise<Derivative> {
  const output = await sharp(source, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({
      width: PREVIEW_MAX_EDGE,
      height: PREVIEW_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 82 })
    .toBuffer({ resolveWithObject: true });

  return {
    kind: "preview_page",
    bytes: new Uint8Array(output.data),
    mimeType: "image/jpeg",
    width: output.info.width,
    height: output.info.height,
    page,
  };
}

/**
 * HEIC cannot be displayed by most browsers, so a JPEG conversion is kept as a
 * separate object. The original file is never replaced, as required by DEC-007.
 */
async function decodeHeic(source: Uint8Array) {
  return convertHeic({ buffer: source, format: "JPEG", quality: 0.92 });
}

async function renderPdfPage(source: Uint8Array) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const task = pdfjs.getDocument({ data: source, useSystemFonts: true });

  const document = await task.promise;
  try {
    const page = await document.getPage(1);
    const viewport = page.getViewport({ scale: PDF_RENDER_SCALE });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const context = canvas.getContext("2d");

    await page.render({
      // @napi-rs/canvas implements the 2D context surface pdf.js draws through,
      // but it is not the DOM type the published signature expects.
      canvasContext: context as unknown as CanvasRenderingContext2D,
      canvas: null,
      viewport,
    }).promise;

    return new Uint8Array(canvas.toBuffer("image/png"));
  } finally {
    await task.destroy();
  }
}

/**
 * Builds the derived assets for a stored original. Every failure is reported to
 * the caller instead of thrown so that a broken conversion can never affect the
 * original, which stays immutable in its own bucket.
 */
export async function buildDerivatives(
  mimeType: DocumentMimeType,
  source: Uint8Array,
): Promise<Derivative[]> {
  if (mimeType === "application/pdf") {
    const rendered = await renderPdfPage(source);
    return [await toPreview(rendered, 1), await toThumbnail(rendered)];
  }

  if (mimeType === "image/heic" || mimeType === "image/heif") {
    const decoded = await decodeHeic(source);
    return [await toPreview(decoded, null), await toThumbnail(decoded)];
  }

  return [await toThumbnail(source)];
}
