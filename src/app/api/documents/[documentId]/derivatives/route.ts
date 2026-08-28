import { NextResponse } from "next/server";

import { buildDerivatives } from "@/lib/documents/derivatives";
import { isDocumentMimeType } from "@/lib/documents/limits";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const DERIVATIVES_BUCKET = "document-derivatives";
const UPLOADER_ROLES = ["owner", "admin", "operator"];

type RouteContext = { params: Promise<{ documentId: string }> };

/**
 * Derived assets are best effort. The original has already been validated and
 * stored by the time this runs, so a failure here only records a status and
 * never touches the immutable file.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const { documentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { data: document } = await supabase
    .from("documents")
    .select("id, organization_id, storage_path, mime_type, status")
    .eq("id", documentId)
    .eq("status", "stored")
    .maybeSingle();

  if (!document) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", document.organization_id)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!membership || !UPLOADER_ROLES.includes(membership.role)) {
    return NextResponse.json({ error: "Permisos insuficientes." }, { status: 403 });
  }

  const mimeType = document.mime_type ?? "";
  if (!isDocumentMimeType(mimeType)) {
    return NextResponse.json({ error: "Formato no soportado." }, { status: 422 });
  }

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json(
      { error: "La generación de vistas previas no está configurada." },
      { status: 503 },
    );
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from("documents")
    .download(document.storage_path);

  if (downloadError || !blob) {
    await admin.rpc("set_document_derivative_status", {
      next_status: "failed",
      target_document_id: documentId,
    });
    return NextResponse.json({ error: "No pudimos leer el original." }, { status: 502 });
  }

  try {
    const source = new Uint8Array(await blob.arrayBuffer());
    const derivatives = await buildDerivatives(mimeType, source);

    for (const derivative of derivatives) {
      const suffix = derivative.page === null ? "" : `-p${derivative.page}`;
      const extension = derivative.mimeType === "image/webp" ? "webp" : "jpg";
      const path = `${document.organization_id}/${documentId}/${derivative.kind}${suffix}.${extension}`;

      const { error: uploadError } = await admin.storage
        .from(DERIVATIVES_BUCKET)
        .upload(path, derivative.bytes, {
          contentType: derivative.mimeType,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { error: registerError } = await admin.rpc("register_document_derivative", {
        target_bytes: derivative.bytes.byteLength,
        target_document_id: documentId,
        target_height: derivative.height,
        target_kind: derivative.kind,
        target_mime: derivative.mimeType,
        target_page: derivative.page,
        target_storage_path: path,
        target_width: derivative.width,
      });

      if (registerError) throw registerError;
    }

    await admin.rpc("set_document_derivative_status", {
      next_status: "ready",
      target_document_id: documentId,
    });

    return NextResponse.json({ status: "ready", count: derivatives.length });
  } catch {
    await admin.rpc("set_document_derivative_status", {
      next_status: "failed",
      target_document_id: documentId,
    });

    return NextResponse.json({ status: "failed" }, { status: 200 });
  }
}
