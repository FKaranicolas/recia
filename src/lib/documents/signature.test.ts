import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  hasCompleteTrailer,
  readDimensions,
  readHeifDimensions,
  readJpegDimensions,
  readPngDimensions,
  sniffMimeType,
} from "./signature";

const fixtures = join(import.meta.dirname, "__fixtures__");

function load(name: string) {
  return new Uint8Array(readFileSync(join(fixtures, name)));
}

describe("sniffMimeType", () => {
  it("recognises every accepted format from its bytes", () => {
    expect(sniffMimeType(load("sample.pdf"))).toBe("application/pdf");
    expect(sniffMimeType(load("sample.jpg"))).toBe("image/jpeg");
    expect(sniffMimeType(load("sample.png"))).toBe("image/png");
    expect(sniffMimeType(load("sample.heic"))).toBe("image/heic");
  });

  it("refuses formats outside the contract", () => {
    expect(sniffMimeType(load("not-a-document.svg"))).toBeNull();
    expect(sniffMimeType(new Uint8Array([0x00, 0x01, 0x02, 0x03]))).toBeNull();
  });
});

describe("readDimensions", () => {
  it("reads the size out of each image container", () => {
    expect(readPngDimensions(load("sample.png"))).toEqual({ width: 320, height: 240 });
    expect(readJpegDimensions(load("sample.jpg"))).toEqual({ width: 320, height: 240 });
    expect(readHeifDimensions(load("sample.heic"))).toEqual({ width: 320, height: 240 });
  });

  it("reports the dimensions declared by an oversized image", () => {
    expect(readDimensions("image/png", load("oversized.png"))).toEqual({
      width: 7000,
      height: 6000,
    });
  });

  it("returns nothing for a document that carries no raster size", () => {
    expect(readDimensions("application/pdf", load("sample.pdf"))).toBeNull();
  });
});

describe("hasCompleteTrailer", () => {
  it("accepts a complete image", () => {
    expect(hasCompleteTrailer("image/png", load("sample.png"))).toBe(true);
    expect(hasCompleteTrailer("image/jpeg", load("sample.jpg"))).toBe(true);
  });

  it("detects an interrupted transfer", () => {
    expect(hasCompleteTrailer("image/png", load("truncated.png"))).toBe(false);
  });
});
