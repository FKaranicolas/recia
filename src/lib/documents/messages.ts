import type { DocumentRejection } from "./inspect";

import { MAX_IMAGE_PIXELS, MAX_PDF_PAGES, formatBytes, MAX_IMAGE_BYTES, MAX_PDF_BYTES } from "./limits";

export const rejectionMessages: Record<DocumentRejection, string> = {
  unsupported_format: "Solo aceptamos PDF, JPG, PNG y HEIC.",
  format_mismatch:
    "El contenido del archivo no coincide con su extensión. Volvé a exportarlo y probá de nuevo.",
  too_large: `Las imágenes admiten hasta ${formatBytes(MAX_IMAGE_BYTES)} y los PDF hasta ${formatBytes(MAX_PDF_BYTES)}.`,
  too_many_pages: `Un PDF puede tener hasta ${MAX_PDF_PAGES} páginas.`,
  too_many_pixels: `La imagen supera los ${MAX_IMAGE_PIXELS / 1_000_000} megapíxeles.`,
  encrypted: "El PDF está protegido con contraseña. Quitá la protección y volvé a subirlo.",
  corrupted: "No pudimos leer el archivo. Puede estar incompleto o dañado.",
};
