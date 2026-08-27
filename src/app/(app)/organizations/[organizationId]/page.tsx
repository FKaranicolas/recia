import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { InvitationForm } from "@/components/invitation-form";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/supabase/user";
import type { OrganizationRole } from "@/types/database";

import {
  removeMember,
  revokeInvitation,
  transferOwnership,
  updateMemberRole,
} from "../actions";

const roleLabels: Record<OrganizationRole, string> = {
  owner: "Propietario",
  admin: "Administrador",
  operator: "Operador",
  viewer: "Solo lectura",
};

type OrganizationPageProps = {
  params: Promise<{ organizationId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function OrganizationPage({ params, searchParams }: OrganizationPageProps) {
  const { organizationId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const [{ data: organization }, { data: currentMembership }, { data: organizations }] =
    await Promise.all([
      supabase.from("organizations").select("id, name").eq("id", organizationId).maybeSingle(),
      supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
      supabase.from("organizations").select("id, name").order("name"),
    ]);

  if (!organization || !currentMembership) notFound();

  const { data: memberRows } = await supabase
    .from("organization_members")
    .select("user_id, role, created_at")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .order("created_at");
  const members = memberRows ?? [];
  const userIds = members.map((member) => member.user_id);
  const { data: profileRows } = userIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] };
  const profiles = profileRows ?? [];
  const profileNames = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
  const canManage = currentMembership.role === "owner" || currentMembership.role === "admin";
  const { data: invitationRows } = canManage
    ? await supabase.rpc("list_organization_invitations", {
        target_organization_id: organizationId,
      })
    : { data: [] };
  const invitations = invitationRows ?? [];
  const query = await searchParams;

  return (
    <div className="workspaceContent">
      <aside className="organizationRail">
        <p className="eyebrow">Organizaciones</p>
        <nav aria-label="Organizaciones disponibles">
          {organizations?.map((item) => (
            <Link
              aria-current={item.id === organizationId ? "page" : undefined}
              href={`/organizations/${item.id}`}
              key={item.id}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      <section className="organizationMain">
        <header className="organizationHeader">
          <div>
            <p className="eyebrow">Organización activa</p>
            <h1>{organization.name}</h1>
          </div>
          <span className="roleBadge">{roleLabels[currentMembership.role]}</span>
        </header>
        {query.error ? <p className="formMessage error">{query.error}</p> : null}

        <section className="workspaceNotice">
          <strong>Aislamiento activo</strong>
          <p>
            Las membresías y políticas RLS limitan este espacio. Documentos y OCR llegan en
            los próximos hitos.
          </p>
        </section>

        <section className="memberSection" aria-labelledby="members-title">
          <div className="sectionTitle">
            <div>
              <p className="eyebrow">Equipo</p>
              <h2 id="members-title">Integrantes activos</h2>
            </div>
            <span>{members.length}</span>
          </div>
          <div className="memberList">
            {members.map((member) => {
              const isOwner = member.role === "owner";
              const isSelf = member.user_id === user.id;
              return (
                <article className="memberRow" key={member.user_id}>
                  <div>
                    <strong>{profileNames.get(member.user_id) ?? "Integrante"}</strong>
                    <small>{isSelf ? "Tu cuenta" : member.user_id.slice(0, 8)}</small>
                  </div>
                  <span>{roleLabels[member.role]}</span>
                  {canManage && !isOwner && !isSelf ? (
                    <div className="memberActions">
                      <form action={updateMemberRole}>
                        <input name="organizationId" type="hidden" value={organizationId} />
                        <input name="userId" type="hidden" value={member.user_id} />
                        <select aria-label="Nuevo rol" defaultValue={member.role} name="role">
                          <option value="admin">Administrador</option>
                          <option value="operator">Operador</option>
                          <option value="viewer">Solo lectura</option>
                        </select>
                        <button className="smallButton" type="submit">
                          Guardar
                        </button>
                      </form>
                      {currentMembership.role === "owner" ? (
                        <form action={transferOwnership}>
                          <input name="organizationId" type="hidden" value={organizationId} />
                          <input name="userId" type="hidden" value={member.user_id} />
                          <button className="textButton" type="submit">
                            Transferir propiedad
                          </button>
                        </form>
                      ) : null}
                      <form action={removeMember}>
                        <input name="organizationId" type="hidden" value={organizationId} />
                        <input name="userId" type="hidden" value={member.user_id} />
                        <button className="textButton danger" type="submit">
                          Quitar
                        </button>
                      </form>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        {canManage ? (
          <section className="inviteSection" aria-labelledby="invite-title">
            <div>
              <p className="eyebrow">Acceso temporal</p>
              <h2 id="invite-title">Invitar integrante</h2>
              <p>El destinatario debe confirmar el mismo email antes de aceptar.</p>
            </div>
            <InvitationForm organizationId={organizationId} />
            {invitations.length ? (
              <div className="pendingInvites">
                <h3>Invitaciones pendientes</h3>
                {invitations.map((invitation) => (
                  <div key={invitation.invitation_id}>
                    <span>
                      {invitation.email} · {roleLabels[invitation.role]}
                    </span>
                    <form action={revokeInvitation}>
                      <input name="organizationId" type="hidden" value={organizationId} />
                      <input
                        name="invitationId"
                        type="hidden"
                        value={invitation.invitation_id}
                      />
                      <button className="textButton danger" type="submit">
                        Revocar
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
      </section>
    </div>
  );
}
