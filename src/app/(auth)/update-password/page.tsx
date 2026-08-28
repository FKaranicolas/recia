import { redirect } from "next/navigation";

import { PASSWORD_HINT } from "@/lib/password";
import { getCurrentUser } from "@/lib/supabase/user";

import { updatePassword } from "../actions";

type UpdatePasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function UpdatePasswordPage({ searchParams }: UpdatePasswordPageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?error=El+enlace+de+recuperación+no+es+válido.");
  const params = await searchParams;

  return (
    <section className="authCard" aria-labelledby="new-password-title">
      <p className="eyebrow">Cuenta confirmada</p>
      <h1 id="new-password-title">Definí una nueva contraseña</h1>
      {params.error ? <p className="formMessage error">{params.error}</p> : null}
      <form action={updatePassword} className="authForm">
        <label>
          Nueva contraseña
          <input
            aria-describedby="password-help"
            autoComplete="new-password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>
        <small id="password-help">{PASSWORD_HINT}</small>
        <button type="submit">Actualizar contraseña</button>
      </form>
    </section>
  );
}
