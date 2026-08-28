// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildDerivatives } from "./derivatives";
import { sniffMimeType } from "./signature";

const fixtures = join(import.meta.dirname, "__fixtures__");

function load(name: string) {
  return new Uint8Array(readFileSync(join(fixtures, name)));
}

describe("buildDerivatives", () => {
  it("renders the first page of a PDF and a thumbnail", async () => {
    const derivatives = await buildDerivatives("application/pdf", load("sample.pdf"));

    expect(derivatives.map((derivative) => derivative.kind)).toEqual([
      "preview_page",
      "thumbnail",
    ]);
    expect(derivatives[0].page).toBe(1);
    expect(sniffMimeType(derivatives[0].bytes)).toBe("image/jpeg");
    expect(derivatives[1].width).toBeLessThanOrEqual(480);
    expect(derivatives[1].height).toBeLessThanOrEqual(480);
  }, 60_000);

  it("converts HEIC into a format browsers can display", async () => {
    const derivatives = await buildDerivatives("image/heic", load("sample.heic"));

    expect(derivatives).toHaveLength(2);
    expect(sniffMimeType(derivatives[0].bytes)).toBe("image/jpeg");
    expect(derivatives[0].width).toBe(320);
    expect(derivatives[0].height).toBe(240);
  }, 60_000);

  it("only builds a thumbnail for a format browsers already read", async () => {
    const derivatives = await buildDerivatives("image/png", load("sample.png"));

    expect(derivatives).toHaveLength(1);
    expect(derivatives[0].kind).toBe("thumbnail");
    expect(derivatives[0].mimeType).toBe("image/webp");
    expect(derivatives[0].bytes.byteLength).toBeGreaterThan(0);
  }, 60_000);
});
