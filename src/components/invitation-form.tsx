"use client";

import { useActionState } from "react";

import {
  createInvitation,
  type InvitationState,
} from "@/app/(app)/organizations/actions";

const initialState: InvitationState = { error: null, invitationUrl: null };

export function InvitationForm({ organizationId }: { organizationId: string }) {
  const [state, action, pending] = useActionState(createInvitation, initialState);

  return (
    <form action={action} className="memberForm">
      <input name="organizationId" type="hidden" value={organizationId} />
      <label>
        Email confirmado del destinatario
        <input name="email" required type="email" />
      </label>
      <label>
        Rol
        <select defaultValue="operator" name="role">
          <option value="admin">Administrador</option>
          <option value="operator">Operador</option>
          <option value="viewer">Solo lectura</option>
        </select>
      </label>
      <button disabled={pending} type="submit">
        {pending ? "Creando…" : "Crear enlace por 7 días"}
      </button>
      {state.error ? (
        <p className="formMessage error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.invitationUrl ? (
        <div className="inviteResult" role="status">
          <strong>Enlace creado</strong>
          <p>Compartilo únicamente con el destinatario. Se muestra una sola vez.</p>
          <input aria-label="Enlace de invitación" readOnly value={state.invitationUrl} />
        </div>
      ) : null}
    </form>
  );
}
