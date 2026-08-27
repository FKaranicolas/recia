import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { createOrganization } from "./actions";

type OnboardingPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const supabase = await createClient();
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id")
    .order("created_at")
    .limit(1);

  if (organizations?.[0]) redirect(`/organizations/${organizations[0].id}`);
  const params = await searchParams;

  return (
    <section className="onboardingPanel" aria-labelledby="onboarding-title">
      <p className="eyebrow">Primer espacio</p>
      <h1 id="onboarding-title">Creá tu organización</h1>
      <p>
        Será el límite seguro para integrantes, documentos y permisos. Vas a quedar como
        propietario único.
      </p>
      {params.error ? <p className="formMessage error">{params.error}</p> : null}
      <form action={createOrganization} className="authForm">
        <label>
          Nombre de la organización
          <input autoFocus maxLength={120} minLength={2} name="name" required />
        </label>
        <button type="submit">Crear organización</button>
      </form>
    </section>
  );
}
