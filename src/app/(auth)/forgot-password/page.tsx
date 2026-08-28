import Link from "next/link";

import { requestPasswordReset } from "../actions";

type ForgotPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;

  return (
    <section className="authCard" aria-labelledby="recovery-title">
      <p className="eyebrow">Recuperar acceso</p>
      <h1 id="recovery-title">Cambiá tu contraseña</h1>
      <p className="authLead">
        Te enviaremos un enlace si el email corresponde a una cuenta.
      </p>
      {params.error ? <p className="formMessage error">{params.error}</p> : null}
      <form action={requestPasswordReset} className="authForm">
        <label>
          Email
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <button type="submit">Enviar enlace</button>
      </form>
      <p className="authAlternative">
        <Link href="/login">Volver al ingreso</Link>
      </p>
    </section>
  );
}
