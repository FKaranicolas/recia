"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function InvitationCapture() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = window.location.hash.slice(1);
    if (!token) return;

    void fetch("/api/invitations/capture", {
      body: JSON.stringify({ token }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    })
      .then((response) => {
        if (!response.ok) throw new Error("Invitation capture failed");
        window.history.replaceState(null, "", "/invitations");
        router.refresh();
      })
      .catch(() => {
        setError("No pudimos guardar la invitación. Revisá tu conexión e intentá de nuevo.");
      });
  }, [router]);

  return error ? (
    <p className="formMessage error" role="alert">
      {error}
    </p>
  ) : null;
}
