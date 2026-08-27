"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function acceptInvitation() {
  const cookieStore = await cookies();
  const token = cookieStore.get("recia_invitation")?.value;
  if (!token) redirect("/invitations?error=El+enlace+no+está+disponible.");

  const supabase = await createClient();
  const { data: organizationId, error } = await supabase.rpc(
    "accept_organization_invitation",
    { invitation_token: token },
  );

  if (error || !organizationId) {
    redirect("/invitations?error=La+invitación+es+inválida,+venció+o+usa+otro+email.");
  }

  cookieStore.delete("recia_invitation");
  redirect(`/organizations/${organizationId}`);
}
