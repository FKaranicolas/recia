"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { OrganizationRole } from "@/types/database";

export type InvitationState = {
  error: string | null;
  invitationUrl: string | null;
};

const memberRoles: OrganizationRole[] = ["admin", "operator", "viewer"];

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function organizationPath(organizationId: string, error?: string) {
  const path = `/organizations/${organizationId}`;
  return error ? `${path}?error=${encodeURIComponent(error)}` : path;
}

export async function createInvitation(
  _state: InvitationState,
  formData: FormData,
): Promise<InvitationState> {
  const organizationId = field(formData, "organizationId");
  const email = field(formData, "email").toLowerCase();
  const role = field(formData, "role") as OrganizationRole;

  if (!organizationId || !email.includes("@") || !memberRoles.includes(role)) {
    return { error: "Revisá el email y el rol.", invitationUrl: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_organization_invitation", {
    target_email: email,
    target_organization_id: organizationId,
    target_role: role,
  });

  const token = data?.[0]?.token;
  if (error || !token) {
    return {
      error: "No pudimos crear la invitación. Verificá que el email no sea integrante.",
      invitationUrl: null,
    };
  }

  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (!origin) return { error: "No pudimos construir el enlace.", invitationUrl: null };

  revalidatePath(`/organizations/${organizationId}`);
  return {
    error: null,
    invitationUrl: `${origin}/invitations#${token}`,
  };
}

export async function revokeInvitation(formData: FormData) {
  const organizationId = field(formData, "organizationId");
  const invitationId = field(formData, "invitationId");
  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_organization_invitation", {
    target_invitation_id: invitationId,
    target_organization_id: organizationId,
  });

  if (error) redirect(organizationPath(organizationId, "No pudimos revocar la invitación."));
  revalidatePath(`/organizations/${organizationId}`);
}

export async function updateMemberRole(formData: FormData) {
  const organizationId = field(formData, "organizationId");
  const userId = field(formData, "userId");
  const role = field(formData, "role") as OrganizationRole;
  const supabase = await createClient();

  if (!memberRoles.includes(role)) {
    redirect(organizationPath(organizationId, "El rol seleccionado no es válido."));
  }

  const { error } = await supabase.rpc("update_organization_member_role", {
    target_organization_id: organizationId,
    target_role: role,
    target_user_id: userId,
  });

  if (error) redirect(organizationPath(organizationId, "No pudimos actualizar el rol."));
  revalidatePath(`/organizations/${organizationId}`);
}

export async function removeMember(formData: FormData) {
  const organizationId = field(formData, "organizationId");
  const userId = field(formData, "userId");
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_organization_member", {
    target_organization_id: organizationId,
    target_user_id: userId,
  });

  if (error) redirect(organizationPath(organizationId, "No pudimos quitar al integrante."));
  revalidatePath(`/organizations/${organizationId}`);
}

export async function transferOwnership(formData: FormData) {
  const organizationId = field(formData, "organizationId");
  const userId = field(formData, "userId");
  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_organization_ownership", {
    next_owner_id: userId,
    target_organization_id: organizationId,
  });

  if (error) redirect(organizationPath(organizationId, "No pudimos transferir la propiedad."));
  revalidatePath(`/organizations/${organizationId}`);
}
