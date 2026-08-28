import { describe, expect, it } from "vitest";

import {
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  declaredMimeType,
  isDocumentMimeType,
  maxBytesFor,
} from "./limits";

describe("declaredMimeType", () => {
  it("keeps a type the browser reported correctly", () => {
    expect(declaredMimeType("factura.pdf", "application/pdf")).toBe("application/pdf");
  });

  it("falls back to the extension when the browser reports nothing", () => {
    expect(declaredMimeType("foto.HEIC", "")).toBe("image/heic");
    expect(declaredMimeType("recibo.jpeg", "")).toBe("image/jpeg");
  });

  it("refuses anything outside the accepted formats", () => {
    expect(declaredMimeType("planilla.xlsx", "application/vnd.ms-excel")).toBeNull();
    expect(declaredMimeType("logo.svg", "image/svg+xml")).toBeNull();
  });
});

describe("size ceilings", () => {
  it("applies the limits decided in DEC-017", () => {
    expect(maxBytesFor("application/pdf")).toBe(MAX_PDF_BYTES);
    expect(maxBytesFor("image/jpeg")).toBe(MAX_IMAGE_BYTES);
    expect(MAX_PDF_BYTES).toBe(20 * 1024 * 1024);
    expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
  });

  it("recognises only the accepted media types", () => {
    expect(isDocumentMimeType("image/heif")).toBe(true);
    expect(isDocumentMimeType("image/gif")).toBe(false);
  });
});
