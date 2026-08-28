import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

const SIGNED_URL_TTL_SECONDS = 60;

type RouteContext = { params: Promise<{ documentId: string }> };

/**
 * Hands out a short lived signed URL for an original. Row level security
 * decides whether the caller may see the document at all, so a document from
 * another organization is indistinguishable from one that does not exist.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { documentId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { data: document } = await supabase
    .from("documents")
    .select("id, storage_path, original_filename, status")
    .eq("id", documentId)
    .eq("status", "stored")
    .maybeSingle();

  if (!document) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }

  const { data: signed, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(document.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: document.original_filename,
    });

  if (error || !signed) {
    return NextResponse.json({ error: "No pudimos preparar la descarga." }, { status: 502 });
  }

  return NextResponse.redirect(signed.signedUrl, { status: 307 });
}
