create function app_private.enforce_organization_creation_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_ownerships integer;
begin
  if new.created_by is null then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.created_by::text, 1)
  );

  select count(*)
  into active_ownerships
  from public.organization_members as member
  where member.user_id = new.created_by
    and member.role = 'owner'
    and member.status = 'active';

  if active_ownerships >= 10 then
    raise exception 'A user can own at most 10 active organizations'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_organization_creation_limit() from public;

create trigger organizations_limit_per_owner
before insert on public.organizations
for each row execute function app_private.enforce_organization_creation_limit();

create function app_private.enforce_invitation_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recent_invitations integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.organization_id::text, 0)
  );

  select count(*)
  into recent_invitations
  from public.organization_invitations as invitation
  where invitation.organization_id = new.organization_id
    and invitation.created_at > now() - interval '1 hour';

  if recent_invitations >= 30 then
    raise exception 'An organization can create at most 30 invitations per hour'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_invitation_rate_limit() from public;

create trigger organization_invitations_limit_per_hour
before insert on public.organization_invitations
for each row execute function app_private.enforce_invitation_rate_limit();
