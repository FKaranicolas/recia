import Link from "next/link";

import { safeNextPath } from "@/lib/navigation";

import { signIn } from "../actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = safeNextPath(params.next);

  return (
    <section className="authCard" aria-labelledby="login-title">
      <p className="eyebrow">Área de trabajo</p>
      <h1 id="login-title">Ingresá a RECIA</h1>
      <p className="authLead">Usá la cuenta confirmada asociada a tus organizaciones.</p>
      {params.message ? <p className="formMessage success">{params.message}</p> : null}
      {params.error ? <p className="formMessage error">{params.error}</p> : null}
      <form action={signIn} className="authForm">
        {next ? <input name="next" type="hidden" value={next} /> : null}
        <label>
          Email
          <input autoComplete="email" name="email" required type="email" />
        </label>
        <label>
          Contraseña
          <input autoComplete="current-password" name="password" required type="password" />
        </label>
        <button type="submit">Ingresar</button>
      </form>
      <Link className="forgotLink" href="/forgot-password">
        ¿Olvidaste tu contraseña?
      </Link>
      <p className="authAlternative">
        ¿Todavía no tenés cuenta?{" "}
        <Link href={next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"}>
          Crear cuenta
        </Link>
      </p>
    </section>
  );
}
