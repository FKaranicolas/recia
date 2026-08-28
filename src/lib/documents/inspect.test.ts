import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { inspectDocument } from "./inspect";

const fixtures = join(import.meta.dirname, "__fixtures__");

function load(name: string) {
  return new Uint8Array(readFileSync(join(fixtures, name)));
}

describe("inspectDocument", () => {
  it("accepts a PDF and reports its page count", async () => {
    const result = await inspectDocument(load("sample.pdf"), "application/pdf");

    expect(result).toEqual({
      ok: true,
      mimeType: "application/pdf",
      byteSize: load("sample.pdf").byteLength,
      pageCount: 1,
      width: null,
      height: null,
    });
  });

  it("accepts every image format with its dimensions", async () => {
    await expect(inspectDocument(load("sample.jpg"), "image/jpeg")).resolves.toMatchObject({
      ok: true,
      mimeType: "image/jpeg",
      width: 320,
      height: 240,
    });

    await expect(inspectDocument(load("sample.png"), "image/png")).resolves.toMatchObject({
      ok: true,
      mimeType: "image/png",
      width: 320,
      height: 240,
    });

    await expect(inspectDocument(load("sample.heic"), "image/heic")).resolves.toMatchObject({
      ok: true,
      mimeType: "image/heic",
      width: 320,
      height: 240,
    });
  });

  it("treats HEIF as the same container family as HEIC", async () => {
    await expect(inspectDocument(load("sample.heic"), "image/heif")).resolves.toMatchObject({
      ok: true,
      mimeType: "image/heic",
    });
  });

  it("rejects a format outside the contract", async () => {
    await expect(
      inspectDocument(load("not-a-document.svg"), "image/png"),
    ).resolves.toEqual({ ok: false, reason: "unsupported_format" });
  });

  it("rejects a file whose bytes contradict its declared type", async () => {
    await expect(
      inspectDocument(load("sample.png"), "application/pdf"),
    ).resolves.toEqual({ ok: false, reason: "format_mismatch" });
  });

  it("rejects an interrupted upload", async () => {
    await expect(inspectDocument(load("truncated.png"), "image/png")).resolves.toEqual({
      ok: false,
      reason: "corrupted",
    });
  });

  it("rejects an image above the megapixel ceiling", async () => {
    await expect(inspectDocument(load("oversized.png"), "image/png")).resolves.toEqual({
      ok: false,
      reason: "too_many_pixels",
    });
  });

  it("rejects a PDF with more pages than the contract allows", async () => {
    await expect(
      inspectDocument(load("too-many-pages.pdf"), "application/pdf"),
    ).resolves.toEqual({ ok: false, reason: "too_many_pages" });
  });

  it("rejects a password protected PDF", async () => {
    await expect(
      inspectDocument(load("encrypted.pdf"), "application/pdf"),
    ).resolves.toEqual({ ok: false, reason: "encrypted" });
  });

  it("rejects an empty upload", async () => {
    await expect(inspectDocument(new Uint8Array(), "image/png")).resolves.toEqual({
      ok: false,
      reason: "corrupted",
    });
  });
});
