import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DocumentUploader } from "@/components/document-uploader";
import { formatBytes } from "@/lib/documents/limits";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

import { sweepStaleUploads } from "./actions";

const THUMBNAIL_TTL_SECONDS = 60;
const UPLOADER_ROLES = ["owner", "admin", "operator"];

const typeLabels: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/heic": "HEIC",
  "image/heif": "HEIF",
};

const derivativeLabels: Record<string, string> = {
  pending: "Vista previa en proceso",
  ready: "",
  failed: "Sin vista previa",
  unsupported: "Vista previa no disponible",
};

type DocumentsPageProps = {
  params: Promise<{ organizationId: string }>;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default async function DocumentsPage({ params }: DocumentsPageProps) {
  const { organizationId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: organization }, { data: membership }, { data: organizations }] =
    await Promise.all([
      supabase.from("organizations").select("id, name").eq("id", organizationId).maybeSingle(),
      supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase.from("organizations").select("id, name").order("name"),
    ]);

  if (!organization || !membership) notFound();

  // Interrupted uploads leave a reserved row behind; clearing them here keeps
  // the archive consistent without a scheduled job.
  await sweepStaleUploads(organizationId).catch(() => null);

  const { data: documentRows } = await supabase
    .from("documents")
    .select(
      "id, original_filename, mime_type, byte_size, page_count, width_px, height_px, checksum_sha256, derivative_status, created_at, uploaded_by",
    )
    .eq("organization_id", organizationId)
    .eq("status", "stored")
    .order("created_at", { ascending: false })
    .limit(100);

  const documents = documentRows ?? [];
  const documentIds = documents.map((document) => document.id);

  const { data: derivativeRows } = documentIds.length
    ? await supabase
        .from("document_derivatives")
        .select("document_id, storage_path")
        .eq("kind", "thumbnail")
        .in("document_id", documentIds)
    : { data: [] };
  const derivatives = derivativeRows ?? [];

  const { data: signedThumbnails } = derivatives.length
    ? await supabase.storage
        .from("document-derivatives")
        .createSignedUrls(
          derivatives.map((derivative) => derivative.storage_path),
          THUMBNAIL_TTL_SECONDS,
        )
    : { data: [] };

  const urlByPath = new Map(
    (signedThumbnails ?? [])
      .filter((entry) => entry.signedUrl)
      .map((entry) => [entry.path, entry.signedUrl] as const),
  );
  const thumbnailByDocument = new Map(
    derivatives
      .map((derivative) => [derivative.document_id, urlByPath.get(derivative.storage_path)] as const)
      .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
  );

  const uploaderIds = [
    ...new Set(documents.map((document) => document.uploaded_by).filter((id) => id !== null)),
  ];
  const { data: profileRows } = uploaderIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", uploaderIds)
    : { data: [] };
  const uploaderNames = new Map(
    (profileRows ?? []).map((profile) => [profile.id, profile.display_name]),
  );

  const canUpload = UPLOADER_ROLES.includes(membership.role);

  return (
    <div className="workspaceContent">
      <aside className="organizationRail">
        <p className="eyebrow">Organizaciones</p>
        <nav aria-label="Organizaciones disponibles">
          {organizations?.map((item) => (
            <Link
              aria-current={item.id === organizationId ? "page" : undefined}
              href={`/organizations/${item.id}`}
              key={item.id}
            >
              {item.name}
            </Link>
          ))}
        </nav>
        <p className="eyebrow railDivider">Secciones</p>
        <nav aria-label="Secciones de la organización">
          <Link href={`/organizations/${organizationId}`}>Equipo</Link>
          <Link aria-current="page" href={`/organizations/${organizationId}/documents`}>
            Documentos
          </Link>
        </nav>
      </aside>

      <section className="organizationMain">
        <header className="organizationHeader">
          <div>
            <p className="eyebrow">Archivo documental</p>
            <h1>Comprobantes</h1>
          </div>
          <span className="roleBadge">{documents.length} archivados</span>
        </header>

        <section className="workspaceNotice">
          <strong>Original inmutable</strong>
          <p>
            Cada archivo se valida en el servidor, se guarda en un bucket privado y conserva
            su hash SHA-256. La extracción automática de datos llega en M4; por ahora RECIA
            archiva y devuelve el original tal como lo subiste.
          </p>
        </section>

        {canUpload ? (
          <section className="uploadSection" aria-labelledby="upload-title">
            <div>
              <p className="eyebrow">Nueva carga</p>
              <h2 id="upload-title">Subir comprobante</h2>
            </div>
            <DocumentUploader organizationId={organizationId} />
          </section>
        ) : null}

        <section className="memberSection" aria-labelledby="documents-title">
          <div className="sectionTitle">
            <div>
              <p className="eyebrow">Archivo</p>
              <h2 id="documents-title">Comprobantes archivados</h2>
            </div>
            <span>{documents.length}</span>
          </div>

          {documents.length === 0 ? (
            <p className="emptyArchive">
              Todavía no hay comprobantes archivados en esta organización.
            </p>
          ) : (
            <div className="documentList">
              {documents.map((document) => {
                const thumbnail = thumbnailByDocument.get(document.id);
                const derivativeNote = derivativeLabels[document.derivative_status] ?? "";

                return (
                  <article className="documentRow" key={document.id}>
                    <div className="documentThumb">
                      {thumbnail ? (
                        /* eslint-disable-next-line @next/next/no-img-element --
                           the source is a signed URL that expires in a minute, so it
                           must not be cached by the image optimizer. */
                        <img alt="" src={thumbnail} />
                      ) : (
                        <span aria-hidden="true">
                          {typeLabels[document.mime_type ?? ""] ?? "DOC"}
                        </span>
                      )}
                    </div>

                    <div className="documentMeta">
                      <strong>{document.original_filename}</strong>
                      <small>
                        {typeLabels[document.mime_type ?? ""] ?? "Documento"} ·{" "}
                        {formatBytes(document.byte_size ?? 0)} ·{" "}
                        {document.page_count
                          ? `${document.page_count} ${document.page_count === 1 ? "página" : "páginas"}`
                          : `${document.width_px}×${document.height_px} px`}
                      </small>
                      <small className="documentHash" title={document.checksum_sha256 ?? ""}>
                        SHA-256 {document.checksum_sha256?.slice(0, 16)}…
                      </small>
                    </div>

                    <div className="documentAside">
                      <small>
                        {formatDate(document.created_at)}
                        {document.uploaded_by
                          ? ` · ${uploaderNames.get(document.uploaded_by) ?? "Integrante"}`
                          : ""}
                      </small>
                      {derivativeNote ? <small>{derivativeNote}</small> : null}
                      <a className="smallButton" href={`/api/documents/${document.id}/download`}>
                        Descargar original
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
