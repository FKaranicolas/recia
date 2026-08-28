"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sha256Hex } from "@/lib/documents/checksum";
import { inspectDocument } from "@/lib/documents/inspect";
import { rejectionMessages } from "@/lib/documents/messages";
import {
  MAX_FILENAME_LENGTH,
  declaredMimeType,
  maxBytesFor,
  formatBytes,
} from "@/lib/documents/limits";

export type UploadTicket =
  | { ok: true; documentId: string; path: string; token: string }
  | { ok: false; error: string };

export type FinalizeResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string; duplicateOf?: string };

type UploadRequest = {
  organizationId: string;
  fileName: string;
  reportedType: string;
  byteSize: number;
};

/**
 * Deleting storage objects is a server-only operation: the bucket grants no
 * delete policy to authenticated users, so cleanup runs with the secret key.
 * Failures are tolerated because the database row is the source of truth and
 * an unreferenced object stays unreachable for every organization.
 */
async function removeObjects(paths: string[]) {
  if (paths.length === 0) return;

  try {
    const admin = createAdminClient();
    await admin.storage.from("documents").remove(paths);
  } catch {
    // Leaving an unreferenced object behind is safer than failing the request.
  }
}

export async function requestUpload({
  organizationId,
  fileName,
  reportedType,
  byteSize,
}: UploadRequest): Promise<UploadTicket> {
  const trimmedName = fileName.trim();
  if (!organizationId || trimmedName.length < 1 || trimmedName.length > MAX_FILENAME_LENGTH) {
    return { ok: false, error: "El nombre del archivo no es válido." };
  }

  const mimeType = declaredMimeType(trimmedName, reportedType);
  if (!mimeType) return { ok: false, error: rejectionMessages.unsupported_format };

  if (!Number.isInteger(byteSize) || byteSize <= 0) {
    return { ok: false, error: rejectionMessages.corrupted };
  }

  if (byteSize > maxBytesFor(mimeType)) {
    return {
      ok: false,
      error: `El archivo supera el límite de ${formatBytes(maxBytesFor(mimeType))} para su formato.`,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_document_upload", {
    declared_bytes: byteSize,
    declared_mime: mimeType,
    target_filename: trimmedName,
    target_organization_id: organizationId,
  });

  const reservation = data?.[0];
  if (error || !reservation) {
    return { ok: false, error: "No pudimos preparar la carga. Verificá tus permisos." };
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from("documents")
    .createSignedUploadUrl(reservation.storage_path);

  if (signedError || !signed) {
    await supabase.rpc("discard_document_upload", {
      target_document_id: reservation.document_id,
    });
    return { ok: false, error: "No pudimos preparar la carga." };
  }

  return {
    ok: true,
    documentId: reservation.document_id,
    path: signed.path,
    token: signed.token,
  };
}

export async function discardUpload(documentId: string) {
  const supabase = await createClient();
  const { data: path } = await supabase.rpc("discard_document_upload", {
    target_document_id: documentId,
  });

  if (path) await removeObjects([path]);
}

/**
 * The upload is only trusted once the bytes that actually landed in Storage
 * have been read back, sniffed and hashed. A rejected file leaves no row and
 * no object behind.
 */
export async function finalizeUpload(
  organizationId: string,
  documentId: string,
): Promise<FinalizeResult> {
  const supabase = await createClient();
  const { data: document } = await supabase
    .from("documents")
    .select("id, organization_id, storage_path, declared_mime_type, status")
    .eq("id", documentId)
    .maybeSingle();

  if (!document || document.organization_id !== organizationId) {
    return { ok: false, error: "No encontramos la carga pendiente." };
  }

  if (document.status === "stored") {
    return { ok: true, documentId };
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from("documents")
    .download(document.storage_path);

  if (downloadError || !blob) {
    await discardUpload(documentId);
    return { ok: false, error: "La carga se interrumpió. Volvé a intentarlo." };
  }

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const inspection = await inspectDocument(bytes, document.declared_mime_type);

  if (!inspection.ok) {
    await discardUpload(documentId);
    return { ok: false, error: rejectionMessages[inspection.reason] };
  }

  const checksum = sha256Hex(bytes);
  const { error: finalizeError } = await supabase.rpc("finalize_document_upload", {
    resolved_bytes: inspection.byteSize,
    resolved_checksum: checksum,
    resolved_height: inspection.height,
    resolved_mime: inspection.mimeType,
    resolved_page_count: inspection.pageCount,
    resolved_width: inspection.width,
    target_document_id: documentId,
  });

  if (finalizeError) {
    const isDuplicate = finalizeError.code === "23505";
    let duplicateOf: string | undefined;

    if (isDuplicate) {
      const { data: existing } = await supabase.rpc("find_document_by_checksum", {
        target_checksum: checksum,
        target_organization_id: organizationId,
      });
      duplicateOf = existing ?? undefined;
    }

    await discardUpload(documentId);

    return {
      ok: false,
      error: isDuplicate
        ? "Ese comprobante ya está cargado en esta organización."
        : "No pudimos registrar el documento.",
      duplicateOf,
    };
  }

  revalidatePath(`/organizations/${organizationId}/documents`);
  return { ok: true, documentId };
}

export async function sweepStaleUploads(organizationId: string) {
  const supabase = await createClient();
  const { data: paths } = await supabase.rpc("expire_stale_document_uploads", {
    target_organization_id: organizationId,
  });

  await removeObjects(paths ?? []);
}
