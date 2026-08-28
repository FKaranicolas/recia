import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";

import { deleteAccount } from "./actions";

type AccountPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { count: ownedOrganizations } = await supabase
    .from("organization_members")
    .select("organization_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("role", "owner")
    .eq("status", "active");
  const params = await searchParams;

  return (
    <section className="accountPanel" aria-labelledby="account-title">
      <p className="eyebrow">Seguridad de cuenta</p>
      <h1 id="account-title">Tu cuenta</h1>
      <dl className="accountFacts">
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Organizaciones propias</dt>
          <dd>{ownedOrganizations ?? 0}</dd>
        </div>
      </dl>
      {params.error ? <p className="formMessage error">{params.error}</p> : null}

      <section className="dangerZone" aria-labelledby="delete-account-title">
        <div>
          <p className="eyebrow">Acción irreversible</p>
          <h2 id="delete-account-title">Eliminar cuenta</h2>
          <p>
            Se borrarán el perfil y las membresías. Antes debés transferir o eliminar cada
            organización donde seas propietario.
          </p>
        </div>
        <form action={deleteAccount} className="authForm">
          <label>
            Contraseña actual
            <input autoComplete="current-password" name="password" required type="password" />
          </label>
          <label>
            Escribí ELIMINAR
            <input autoComplete="off" name="confirmation" pattern="ELIMINAR" required />
          </label>
          <button className="dangerButton" type="submit">
            Eliminar cuenta definitivamente
          </button>
        </form>
      </section>
    </section>
  );
}
