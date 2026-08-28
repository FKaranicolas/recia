import "server-only";

import { PDFDocument } from "pdf-lib";

import {
  MAX_IMAGE_PIXELS,
  MAX_PDF_PAGES,
  isDocumentMimeType,
  maxBytesFor,
  type DocumentMimeType,
} from "./limits";
import { hasCompleteTrailer, readDimensions, sniffMimeType } from "./signature";

export type DocumentRejection =
  | "unsupported_format"
  | "format_mismatch"
  | "too_large"
  | "too_many_pages"
  | "too_many_pixels"
  | "encrypted"
  | "corrupted";

export type InspectionResult =
  | {
      ok: true;
      mimeType: DocumentMimeType;
      byteSize: number;
      pageCount: number | null;
      width: number | null;
      height: number | null;
    }
  | { ok: false; reason: DocumentRejection };

function reject(reason: DocumentRejection): InspectionResult {
  return { ok: false, reason };
}

async function inspectPdf(bytes: Uint8Array) {
  let document: PDFDocument;

  try {
    document = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      updateMetadata: false,
    });
  } catch (error) {
    // pdf-lib refuses encrypted documents with a dedicated error; anything
    // else means the file cannot be parsed at all.
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("encrypted")) return reject("encrypted");
    return reject("corrupted");
  }

  if (document.isEncrypted) return reject("encrypted");

  const pageCount = document.getPageCount();
  if (pageCount < 1) return reject("corrupted");
  if (pageCount > MAX_PDF_PAGES) return reject("too_many_pages");

  return { pageCount };
}

/**
 * Reads the real format out of the bytes and applies every limit from
 * DEC-017. The declared type is only used to detect a mismatch: a file that
 * announces itself as a PDF but carries PNG bytes is rejected instead of being
 * silently reclassified.
 */
export async function inspectDocument(
  bytes: Uint8Array,
  declaredMimeType: string,
): Promise<InspectionResult> {
  const byteSize = bytes.byteLength;
  if (byteSize <= 0) return reject("corrupted");

  const sniffed = sniffMimeType(bytes);
  if (!sniffed) return reject("unsupported_format");

  if (!isDocumentMimeType(declaredMimeType)) return reject("unsupported_format");

  // HEIC and HEIF share a container, so they are treated as one family.
  const declaredFamily =
    declaredMimeType === "image/heif" ? "image/heic" : declaredMimeType;
  if (declaredFamily !== sniffed) return reject("format_mismatch");

  if (byteSize > maxBytesFor(sniffed)) return reject("too_large");

  if (sniffed === "application/pdf") {
    const outcome = await inspectPdf(bytes);
    if ("ok" in outcome) return outcome;

    return {
      ok: true,
      mimeType: sniffed,
      byteSize,
      pageCount: outcome.pageCount,
      width: null,
      height: null,
    };
  }

  if (!hasCompleteTrailer(sniffed, bytes)) return reject("corrupted");

  const dimensions = readDimensions(sniffed, bytes);
  if (!dimensions) return reject("corrupted");
  if (dimensions.width * dimensions.height > MAX_IMAGE_PIXELS) {
    return reject("too_many_pixels");
  }

  return {
    ok: true,
    mimeType: sniffed,
    byteSize,
    pageCount: null,
    width: dimensions.width,
    height: dimensions.height,
  };
}
