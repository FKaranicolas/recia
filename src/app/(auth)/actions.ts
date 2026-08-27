"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { safeNextPath } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, field: string) {
  const entry = formData.get(field);
  return typeof entry === "string" ? entry.trim() : "";
}

function authPath(path: "/login" | "/sign-up", message: string, next: string | null) {
  const params = new URLSearchParams({ error: message });
  if (next) params.set("next", next);
  return `${path}?${params}`;
}

export async function signUp(formData: FormData) {
  const displayName = value(formData, "displayName");
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const next = safeNextPath(formData.get("next"));

  if (displayName.length < 2 || displayName.length > 100) {
    redirect(authPath("/sign-up", "El nombre debe tener entre 2 y 100 caracteres.", next));
  }

  if (!email.includes("@")) {
    redirect(authPath("/sign-up", "Ingresá un email válido.", next));
  }

  if (
    password.length < 10 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    redirect(
      authPath(
        "/sign-up",
        "La contraseña debe tener 10 caracteres, mayúscula, minúscula y número.",
        next,
      ),
    );
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const supabase = await createClient();
  const callbackPath = next
    ? `/auth/callback?next=${encodeURIComponent(next)}`
    : "/auth/callback?next=/onboarding";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: origin ? `${origin}${callbackPath}` : undefined,
    },
  });

  if (error) {
    redirect(
      authPath(
        "/sign-up",
        "No pudimos crear la cuenta. Revisá los datos o intentá más tarde.",
        next,
      ),
    );
  }

  const params = new URLSearchParams({ message: "Revisá tu email para confirmar la cuenta." });
  if (next) params.set("next", next);
  redirect(`/login?${params}`);
}

export async function signIn(formData: FormData) {
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(authPath("/login", "Email o contraseña incorrectos.", next));
  }

  if (next) redirect(next);

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id")
    .order("created_at")
    .limit(1);

  if (organizations?.[0]) redirect(`/organizations/${organizations[0].id}`);
  redirect("/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
