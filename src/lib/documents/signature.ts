/**
 * Magic byte inspection without external dependencies. The declared type of an
 * upload is never trusted: the bytes decide which format a document really is,
 * and the dimensions are read from the container itself.
 */

import { isDocumentMimeType, type DocumentMimeType } from "./limits";

export type Dimensions = { width: number; height: number };

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const PDF_SEARCH_WINDOW = 1024;

const HEIF_BRANDS = new Set([
  "heic",
  "heix",
  "heim",
  "heis",
  "hevc",
  "hevx",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
]);

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function readAscii(bytes: Uint8Array, offset: number, length: number) {
  if (bytes.length < offset + length) return "";
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function readUint32(bytes: Uint8Array, offset: number) {
  if (bytes.length < offset + 4) return null;
  return (
    ((bytes[offset] << 24) >>> 0) +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function readUint16(bytes: Uint8Array, offset: number) {
  if (bytes.length < offset + 2) return null;
  return (bytes[offset] << 8) + bytes[offset + 1];
}

function isPdf(bytes: Uint8Array) {
  const window = Math.min(bytes.length, PDF_SEARCH_WINDOW);
  for (let offset = 0; offset <= window - PDF_SIGNATURE.length; offset += 1) {
    if (startsWith(bytes, PDF_SIGNATURE, offset)) return true;
  }
  return false;
}

function heifBrand(bytes: Uint8Array) {
  if (readAscii(bytes, 4, 4) !== "ftyp") return null;

  const majorBrand = readAscii(bytes, 8, 4).toLowerCase();
  if (HEIF_BRANDS.has(majorBrand)) return majorBrand;

  // The major brand can be a generic one while the real codec is declared in
  // the compatible brand list that follows the minor version.
  const boxSize = readUint32(bytes, 0) ?? 0;
  const end = Math.min(boxSize > 0 ? boxSize : bytes.length, bytes.length);
  for (let offset = 16; offset + 4 <= end; offset += 4) {
    const brand = readAscii(bytes, offset, 4).toLowerCase();
    if (HEIF_BRANDS.has(brand)) return brand;
  }

  return null;
}

export function sniffMimeType(bytes: Uint8Array): DocumentMimeType | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return "image/png";
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (heifBrand(bytes)) return "image/heic";
  if (isPdf(bytes)) return "application/pdf";
  return null;
}

export function readPngDimensions(bytes: Uint8Array): Dimensions | null {
  if (!startsWith(bytes, PNG_SIGNATURE)) return null;
  if (readAscii(bytes, 12, 4) !== "IHDR") return null;

  const width = readUint32(bytes, 16);
  const height = readUint32(bytes, 20);
  if (!width || !height) return null;

  return { width, height };
}

export function readJpegDimensions(bytes: Uint8Array): Dimensions | null {
  if (!startsWith(bytes, [0xff, 0xd8, 0xff])) return null;

  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];

    // Padding and standalone markers carry no length field.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }

    const segmentLength = readUint16(bytes, offset + 2);
    if (segmentLength === null || segmentLength < 2) return null;

    const isStartOfFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;

    if (isStartOfFrame) {
      const height = readUint16(bytes, offset + 5);
      const width = readUint16(bytes, offset + 7);
      if (!width || !height) return null;
      return { width, height };
    }

    // Entropy coded data follows the start of scan; dimensions came earlier.
    if (marker === 0xda) return null;

    offset += 2 + segmentLength;
  }

  return null;
}

type Box = { type: string; start: number; end: number; isFullBox: boolean };

function readBoxes(bytes: Uint8Array, start: number, end: number): Box[] {
  const boxes: Box[] = [];
  let offset = start;

  while (offset + 8 <= end && boxes.length < 128) {
    const declaredSize = readUint32(bytes, offset);
    const type = readAscii(bytes, offset + 4, 4);
    if (declaredSize === null || !type) break;

    let headerSize = 8;
    let size = declaredSize;

    if (declaredSize === 1) {
      // 64 bit sizes: the high word must be zero for the file sizes we accept.
      const high = readUint32(bytes, offset + 8);
      const low = readUint32(bytes, offset + 12);
      if (high === null || low === null || high !== 0) break;
      size = low;
      headerSize = 16;
    } else if (declaredSize === 0) {
      size = end - offset;
    }

    if (size < headerSize || offset + size > end) break;

    boxes.push({
      type,
      start: offset + headerSize,
      end: offset + size,
      isFullBox: type === "meta",
    });

    offset += size;
  }

  return boxes;
}

function findBoxes(bytes: Uint8Array, path: string[], start: number, end: number): Box[] {
  const [head, ...rest] = path;
  const matches = readBoxes(bytes, start, end).filter((box) => box.type === head);
  if (rest.length === 0) return matches;

  return matches.flatMap((box) =>
    findBoxes(bytes, rest, box.isFullBox ? box.start + 4 : box.start, box.end),
  );
}

/**
 * HEIC files describe every item they hold, including thumbnails and auxiliary
 * images. The megapixel limit must consider the largest one, so the biggest
 * `ispe` box wins instead of resolving the primary item reference chain.
 */
export function readHeifDimensions(bytes: Uint8Array): Dimensions | null {
  if (!heifBrand(bytes)) return null;

  const spatialExtents = findBoxes(
    bytes,
    ["meta", "iprp", "ipco", "ispe"],
    0,
    bytes.length,
  );

  let largest: Dimensions | null = null;
  for (const box of spatialExtents) {
    const width = readUint32(bytes, box.start + 4);
    const height = readUint32(bytes, box.start + 8);
    if (!width || !height) continue;
    if (!largest || width * height > largest.width * largest.height) {
      largest = { width, height };
    }
  }

  return largest;
}

const PNG_TERMINATOR = [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];
const JPEG_TRAILER_WINDOW = 64;

/**
 * Header parsing alone cannot tell a complete file from one whose transfer was
 * cut short, so the end of stream marker is checked as well.
 */
export function hasCompleteTrailer(mimeType: DocumentMimeType, bytes: Uint8Array) {
  if (mimeType === "image/png") {
    if (bytes.length < PNG_TERMINATOR.length) return false;
    return startsWith(bytes, PNG_TERMINATOR, bytes.length - PNG_TERMINATOR.length);
  }

  if (mimeType === "image/jpeg") {
    const start = Math.max(2, bytes.length - JPEG_TRAILER_WINDOW);
    for (let offset = bytes.length - 2; offset >= start; offset -= 1) {
      if (bytes[offset] === 0xff && bytes[offset + 1] === 0xd9) return true;
    }
    return false;
  }

  return true;
}

export function readDimensions(
  mimeType: DocumentMimeType,
  bytes: Uint8Array,
): Dimensions | null {
  if (mimeType === "image/png") return readPngDimensions(bytes);
  if (mimeType === "image/jpeg") return readJpegDimensions(bytes);
  if (mimeType === "image/heic" || mimeType === "image/heif") {
    return readHeifDimensions(bytes);
  }
  return null;
}

export function isSupportedSignature(value: string | null): value is DocumentMimeType {
  return value !== null && isDocumentMimeType(value);
}
