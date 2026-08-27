"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function createOrganization(formData: FormData) {
  const entry = formData.get("name");
  const name = typeof entry === "string" ? entry.trim() : "";

  if (name.length < 2 || name.length > 120) {
    redirect("/onboarding?error=El+nombre+debe+tener+entre+2+y+120+caracteres.");
  }

  const supabase = await createClient();
  const { data: organizationId, error } = await supabase.rpc("create_organization", {
    organization_name: name,
  });

  if (error || !organizationId) {
    redirect("/onboarding?error=No+pudimos+crear+la+organización.");
  }

  redirect(`/organizations/${organizationId}`);
}
