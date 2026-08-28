create or replace function public.accept_organization_invitation(invitation_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  invitation_organization_id uuid;
  inviter_role public.organization_role;
  existing_status public.membership_status;
  invitation public.organization_invitations%rowtype;
begin
  if current_user_id is null or invitation_token is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select lower(users.email)
  into current_email
  from auth.users as users
  where users.id = current_user_id;

  if current_email is null then
    raise exception 'An account email is required' using errcode = '42501';
  end if;

  select pending_invitation.organization_id
  into invitation_organization_id
  from public.organization_invitations as pending_invitation
  where pending_invitation.token_hash = encode(
    extensions.digest(invitation_token, 'sha256'),
    'hex'
  );

  if invitation_organization_id is null then
    raise exception 'Invitation is invalid or expired' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(invitation_organization_id::text, 0)
  );

  select pending_invitation.*
  into invitation
  from public.organization_invitations as pending_invitation
  where pending_invitation.token_hash = encode(
      extensions.digest(invitation_token, 'sha256'),
      'hex'
    )
  for update;

  if invitation.id is null
    or invitation.accepted_at is not null
    or invitation.revoked_at is not null
    or invitation.expires_at <= now()
  then
    raise exception 'Invitation is invalid or expired' using errcode = '22023';
  end if;

  if current_email <> invitation.email then
    raise exception 'Invitation email does not match the authenticated user'
      using errcode = '42501';
  end if;

  select member.role
  into inviter_role
  from public.organization_members as member
  where member.organization_id = invitation.organization_id
    and member.user_id = invitation.invited_by
    and member.status = 'active';

  if inviter_role is null or inviter_role not in ('owner', 'admin') then
    raise exception 'The inviter no longer has permission' using errcode = '42501';
  end if;

  select member.status
  into existing_status
  from public.organization_members as member
  where member.organization_id = invitation.organization_id
    and member.user_id = current_user_id
  for update;

  if existing_status = 'active' then
    raise exception 'The user is already an active member' using errcode = '23505';
  end if;

  if existing_status = 'removed' then
    update public.organization_members
    set
      role = invitation.role,
      status = 'active',
      added_by = invitation.invited_by
    where organization_id = invitation.organization_id
      and user_id = current_user_id
      and status = 'removed';
  else
    insert into public.organization_members (
      organization_id,
      user_id,
      role,
      status,
      added_by
    )
    values (
      invitation.organization_id,
      current_user_id,
      invitation.role,
      'active',
      invitation.invited_by
    );
  end if;

  update public.organization_invitations
  set
    accepted_at = now(),
    accepted_by = current_user_id
  where id = invitation.id;

  return invitation.organization_id;
end;
$$;

create function app_private.prevent_privileged_bearer_invitation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role in ('owner', 'admin') then
    raise exception 'Bearer invitations can only grant operator or viewer roles'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function app_private.prevent_privileged_bearer_invitation() from public;

create trigger organization_invitations_limit_bearer_role
before insert or update of role on public.organization_invitations
for each row execute function app_private.prevent_privileged_bearer_invitation();

create function public.delete_organization_as_admin(
  target_organization_id uuid,
  requesting_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_organization_id is null or requesting_user_id is null then
    raise exception 'Organization and requesting user are required' using errcode = '22023';
  end if;

  if not app_private.has_organization_role(
    target_organization_id,
    array['owner']::public.organization_role[],
    requesting_user_id
  ) then
    raise exception 'Only the owner can delete the organization' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text, 0)
  );

  if not app_private.has_organization_role(
    target_organization_id,
    array['owner']::public.organization_role[],
    requesting_user_id
  ) then
    raise exception 'Only the owner can delete the organization' using errcode = '42501';
  end if;

  delete from public.organizations
  where id = target_organization_id;

  if not found then
    raise exception 'Organization not found' using errcode = 'P0002';
  end if;
end;
$$;

create function public.delete_account_as_admin(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
begin
  if target_user_id is null then
    raise exception 'Account is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_user_id::text, 1)
  );

  if exists (
    select 1
    from public.organization_members as member
    where member.user_id = target_user_id
      and member.role = 'owner'
      and member.status = 'active'
  ) then
    raise exception 'Owned organizations must be transferred or deleted first'
      using errcode = '23514';
  end if;

  update public.organization_invitations
  set revoked_at = now()
  where invited_by = target_user_id
    and accepted_at is null
    and revoked_at is null;

  delete from auth.users
  where id = target_user_id;

  if not found then
    raise exception 'Account not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_organization_as_admin(uuid, uuid) from public, anon, authenticated;
revoke all on function public.delete_account_as_admin(uuid) from public, anon, authenticated;

grant execute on function public.delete_organization_as_admin(uuid, uuid) to service_role;
grant execute on function public.delete_account_as_admin(uuid) to service_role;
