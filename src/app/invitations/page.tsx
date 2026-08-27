import Link from "next/link";
import { cookies } from "next/headers";

import { InvitationCapture } from "@/components/invitation-capture";
import { getCurrentUser } from "@/lib/supabase/user";

import { acceptInvitation } from "./actions";

type InvitationPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function InvitationPage({ searchParams }: InvitationPageProps) {
  const [user, cookieStore, params] = await Promise.all([
    getCurrentUser(),
    cookies(),
    searchParams,
  ]);
  const hasInvitation = Boolean(cookieStore.get("recia_invitation"));

  return (
    <main className="authShell">
      <Link className="authBrand" href="/">
        <span className="brandMark" aria-hidden="true">
          R
        </span>
        <span>
          <strong>RECIA</strong>
          <small>INVITACIÓN SEGURA</small>
        </span>
      </Link>
      <section className="authCard" aria-labelledby="invitation-title">
        <InvitationCapture />
        <p className="eyebrow">Equipo compartido</p>
        <h1 id="invitation-title">Sumate a la organización</h1>
        {params.error ? <p className="formMessage error">{params.error}</p> : null}
        {!hasInvitation ? (
          <p className="authLead">Abrí el enlace completo que te compartió un administrador.</p>
        ) : user ? (
          <>
            <p className="authLead">
              La invitación se aceptará con <strong>{user.email}</strong>.
            </p>
            <form action={acceptInvitation} className="authForm">
              <button type="submit">Aceptar invitación</button>
            </form>
          </>
        ) : (
          <>
            <p className="authLead">
              Ingresá o creá una cuenta con el mismo email que recibió la invitación.
            </p>
            <div className="authActions">
              <Link className="primaryLink" href="/login?next=/invitations">
                Ingresar
              </Link>
              <Link href="/sign-up?next=/invitations">Crear cuenta</Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
