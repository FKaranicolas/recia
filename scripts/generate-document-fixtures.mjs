/**
 * Regenerates the binary fixtures used by the document validation tests.
 *
 *   node scripts/generate-document-fixtures.mjs
 *
 * The files are committed so the suite runs without native tooling. They carry
 * no fiscal data: every fixture is a synthetic shape or a blank page.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PDFDocument, StandardFonts } from "pdf-lib";
import sharp from "sharp";

const here = dirname(fileURLToPath(import.meta.url));
const outputDirectory = join(here, "..", "src", "lib", "documents", "__fixtures__");

mkdirSync(outputDirectory, { recursive: true });

function write(name, bytes) {
  writeFileSync(join(outputDirectory, name), bytes);
  console.log(`${name}: ${bytes.length} bytes`);
}

async function buildPdf(pageCount) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);

  for (let index = 0; index < pageCount; index += 1) {
    const page = document.addPage([420, 595]);
    page.drawText(`RECIA fixture - page ${index + 1}`, {
      font,
      size: 14,
      x: 40,
      y: 540,
    });
  }

  document.setTitle("RECIA fixture");
  return document.save({ useObjectStreams: false });
}

/**
 * pdf-lib cannot write encrypted files, so the fixture is assembled by hand
 * with a standard security handler in the trailer. Byte offsets are computed
 * while the body is emitted so the cross reference table stays valid.
 */
function buildEncryptedPdf() {
  const header = "%PDF-1.4\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 420 595] >>",
    `<< /Filter /Standard /V 1 /R 2 /O <${"a1".repeat(32)}> /U <${"b2".repeat(32)}> /P -1 >>`,
  ];

  let body = header;
  const offsets = [];

  objects.forEach((value, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${value}\nendobj\n`;
  });

  const xrefOffset = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  const trailer =
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Encrypt 4 0 R ` +
    `/ID [<${"c3".repeat(16)}> <${"c3".repeat(16)}>] >>\n` +
    `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(body + xref + trailer, "latin1");
}

const png = await sharp({
  create: {
    width: 320,
    height: 240,
    channels: 3,
    background: { r: 23, g: 89, b: 74 },
  },
})
  .png()
  .toBuffer();

const jpg = await sharp({
  create: {
    width: 320,
    height: 240,
    channels: 3,
    background: { r: 181, g: 107, b: 22 },
  },
})
  .jpeg({ quality: 80 })
  .toBuffer();

// 7000 x 6000 is 42 megapixels, just above the 40 megapixel ceiling of DEC-017,
// while a flat colour keeps the compressed file small enough to commit.
const oversized = await sharp({
  create: {
    width: 7000,
    height: 6000,
    channels: 3,
    background: { r: 242, g: 243, b: 237 },
  },
})
  .png({ compressionLevel: 9 })
  .toBuffer();

write("sample.png", png);
write("sample.jpg", jpg);
write("oversized.png", oversized);
write("truncated.png", png.subarray(0, 120));
write("sample.pdf", Buffer.from(await buildPdf(1)));
write("too-many-pages.pdf", Buffer.from(await buildPdf(11)));
write("encrypted.pdf", buildEncryptedPdf());
write(
  "not-a-document.svg",
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>\n',
    "utf8",
  ),
);

// HEIC needs a real encoder. macOS ships one through sips; on other platforms
// the committed fixture is kept as is.
try {
  const source = join(outputDirectory, "sample.png");
  execFileSync("sips", [
    "-s",
    "format",
    "heic",
    source,
    "--out",
    join(outputDirectory, "sample.heic"),
  ]);
  console.log("sample.heic: rebuilt with sips");
} catch {
  console.log("sample.heic: skipped, sips is unavailable on this platform");
}
