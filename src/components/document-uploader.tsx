"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  DOCUMENT_ACCEPT_ATTRIBUTE,
  declaredMimeType,
  formatBytes,
  maxBytesFor,
} from "@/lib/documents/limits";
import { createClient } from "@/lib/supabase/client";

import {
  discardUpload,
  finalizeUpload,
  requestUpload,
} from "@/app/(app)/organizations/[organizationId]/documents/actions";

type UploaderProps = { organizationId: string };

type Progress =
  | { phase: "idle" }
  | { phase: "uploading"; fileName: string }
  | { phase: "verifying"; fileName: string }
  | { phase: "done"; fileName: string };

export function DocumentUploader({ organizationId }: UploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<Progress>({ phase: "idle" });
  const [error, setError] = useState<string | null>(null);

  const busy = progress.phase === "uploading" || progress.phase === "verifying";

  async function handleFile(file: File) {
    setError(null);

    const mimeType = declaredMimeType(file.name, file.type);
    if (!mimeType) {
      setError("Solo aceptamos PDF, JPG, PNG y HEIC.");
      return;
    }

    if (file.size > maxBytesFor(mimeType)) {
      setError(
        `El archivo supera el límite de ${formatBytes(maxBytesFor(mimeType))} para su formato.`,
      );
      return;
    }

    setProgress({ phase: "uploading", fileName: file.name });

    const ticket = await requestUpload({
      byteSize: file.size,
      fileName: file.name,
      organizationId,
      reportedType: file.type,
    });

    if (!ticket.ok) {
      setProgress({ phase: "idle" });
      setError(ticket.error);
      return;
    }

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: mimeType });

    if (uploadError) {
      await discardUpload(ticket.documentId);
      setProgress({ phase: "idle" });
      setError("No pudimos subir el archivo. Revisá tu conexión y probá de nuevo.");
      return;
    }

    setProgress({ phase: "verifying", fileName: file.name });
    const result = await finalizeUpload(organizationId, ticket.documentId);

    if (!result.ok) {
      setProgress({ phase: "idle" });
      setError(result.error);
      return;
    }

    // Previews are generated separately so a conversion failure cannot affect
    // the stored original.
    void fetch(`/api/documents/${result.documentId}/derivatives`, {
      method: "POST",
    })
      .catch(() => null)
      .finally(() => router.refresh());

    setProgress({ phase: "done", fileName: file.name });
    router.refresh();
  }

  return (
    <div className="uploadPanel">
      <label className="uploadDrop">
        <input
          accept={DOCUMENT_ACCEPT_ATTRIBUTE}
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) await handleFile(file);
            if (inputRef.current) inputRef.current.value = "";
          }}
          ref={inputRef}
          type="file"
        />
        <span className="uploadDropLabel">
          {busy ? "Procesando…" : "Elegí un comprobante"}
        </span>
        <small>PDF hasta 20 MB y 10 páginas · JPG, PNG o HEIC hasta 10 MB</small>
      </label>

      {progress.phase === "uploading" ? (
        <p className="formMessage" role="status">
          Subiendo {progress.fileName}…
        </p>
      ) : null}
      {progress.phase === "verifying" ? (
        <p className="formMessage" role="status">
          Verificando el contenido de {progress.fileName}…
        </p>
      ) : null}
      {progress.phase === "done" ? (
        <p className="formMessage success" role="status">
          {progress.fileName} quedó archivado.
        </p>
      ) : null}
      {error ? (
        <p className="formMessage error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
