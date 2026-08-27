import Link from "next/link";

import { safeNextPath } from "@/lib/navigation";

import { signUp } from "../actions";

type SignUpPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  return (
    <section className="authCard" aria-labelledby="signup-title">
      <p className="eyebrow">Nueva cuenta</p>
      <h1 id="signup-title">Empezá con una base segura</h1>
      <p className="authLead">
        Confirmaremos tu email antes de permitir acceso a una organización.
      </p>
      {params.error ? <p className="formMessage error">{params.error}</p> : null}
      <form action={signUp} className="authForm">
        {next ? <input name="next" type="hidden" value={next} /> : null}
        <label>
          Nombre
          <input autoComplete="name" maxLength={100} minLength={2} name="displayName" required />
        </label>
        <label>
          Email
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <label>
          Contraseña
          <input
            aria-describedby="password-help"
            autoComplete="new-password"
            minLength={10}
            name="password"
            required
            type="password"
          />
        </label>
        <small id="password-help">10 caracteres, con mayúscula, minúscula y número.</small>
        <button type="submit">Crear cuenta</button>
      </form>
      <p className="authAlternative">
        ¿Ya tenés cuenta?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}>Ingresar</Link>
      </p>
    </section>
  );
}
