/**
 * File contract accepted by RECIA, as decided in DEC-007 and DEC-017.
 * These constants are the single source of truth for the browser, the server
 * actions and the SQL functions that re-validate every upload.
 */

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
] as const;

export type DocumentMimeType = (typeof DOCUMENT_MIME_TYPES)[number];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 40_000_000;
export const MAX_PDF_PAGES = 10;
export const MAX_FILENAME_LENGTH = 255;

export const DOCUMENT_ACCEPT_ATTRIBUTE = ".pdf,.jpg,.jpeg,.png,.heic,.heif";

const extensionsByMimeType: Record<DocumentMimeType, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heif",
};

const mimeTypesByExtension: Record<string, DocumentMimeType> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  heif: "image/heif",
};

export function isDocumentMimeType(value: string): value is DocumentMimeType {
  return (DOCUMENT_MIME_TYPES as readonly string[]).includes(value);
}

export function maxBytesFor(mimeType: DocumentMimeType) {
  return mimeType === "application/pdf" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
}

export function extensionFor(mimeType: DocumentMimeType) {
  return extensionsByMimeType[mimeType];
}

/**
 * Browsers report an empty type for HEIC on several platforms, so the
 * extension is used as a fallback. The declared value is only a hint: the
 * server re-reads the magic bytes before anything is persisted.
 */
export function declaredMimeType(fileName: string, reportedType: string) {
  if (isDocumentMimeType(reportedType)) return reportedType;

  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return mimeTypesByExtension[extension] ?? null;
}

export function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
