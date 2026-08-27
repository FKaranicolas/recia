create extension if not exists pgcrypto with schema extensions;

create type public.organization_role as enum (
  'owner',
  'admin',
  'operator',
  'viewer'
);

create type public.membership_status as enum (
  'active',
  'removed'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (
    display_name is null
    or char_length(btrim(display_name)) between 2 and 100
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.organization_role not null,
  status public.membership_status not null default 'active',
  added_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (organization_id, user_id),
  check (role <> 'owner' or status = 'active')
);

create unique index organization_single_owner_idx
  on public.organization_members (organization_id)
  where role = 'owner' and status = 'active';

create index organization_members_user_idx
  on public.organization_members (user_id, status, organization_id);

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (
    email = lower(btrim(email))
    and char_length(email) between 3 and 320
  ),
  role public.organization_role not null check (role <> 'owner'),
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (accepted_by is null or accepted_at is not null),
  check (accepted_at is null or revoked_at is null)
);

create unique index organization_pending_invitation_idx
  on public.organization_invitations (organization_id, email)
  where accepted_at is null and revoked_at is null;

create index organization_invitations_expiry_idx
  on public.organization_invitations (expires_at)
  where accepted_at is null and revoked_at is null;

create index organizations_created_by_idx
  on public.organizations (created_by);

create index organization_members_added_by_idx
  on public.organization_members (added_by);

create index organization_invitations_organization_idx
  on public.organization_invitations (organization_id);

create index organization_invitations_invited_by_idx
  on public.organization_invitations (invited_by);

create index organization_invitations_accepted_by_idx
  on public.organization_invitations (accepted_by);

create schema app_private;
revoke all on schema app_private from public;

create function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function app_private.set_updated_at();

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function app_private.set_updated_at();

create trigger organization_members_set_updated_at
before update on public.organization_members
for each row execute function app_private.set_updated_at();

create function app_private.enforce_single_active_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_organization_id uuid := coalesce(new.organization_id, old.organization_id);
  active_owner_count integer;
begin
  if not exists (
    select 1
    from public.organizations
    where id = affected_organization_id
  ) then
    return null;
  end if;

  select count(*)
  into active_owner_count
  from public.organization_members
  where organization_id = affected_organization_id
    and role = 'owner'
    and status = 'active';

  if active_owner_count <> 1 then
    raise exception 'An organization must have exactly one active owner'
      using errcode = '23514';
  end if;

  return null;
end;
$$;

revoke all on function app_private.enforce_single_active_owner() from public;

create constraint trigger organization_members_require_owner
after insert or update or delete on public.organization_members
deferrable initially deferred
for each row execute function app_private.enforce_single_active_owner();

create function app_private.prevent_membership_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id <> old.organization_id or new.user_id <> old.user_id then
    raise exception 'Membership identity cannot be changed' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function app_private.prevent_membership_identity_change() from public;

create trigger organization_members_keep_identity
before update on public.organization_members
for each row execute function app_private.prevent_membership_identity_change();

create function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    case
      when char_length(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')))
        between 2 and 100
      then btrim(new.raw_user_meta_data ->> 'display_name')
      else null
    end
  );
  return new;
end;
$$;

create trigger auth_user_created
after insert on auth.users
for each row execute function app_private.handle_new_user();

insert into public.profiles (id, display_name)
select
  users.id,
  case
    when char_length(btrim(coalesce(users.raw_user_meta_data ->> 'display_name', '')))
      between 2 and 100
    then btrim(users.raw_user_meta_data ->> 'display_name')
    else null
  end
from auth.users as users
on conflict (id) do nothing;

create function app_private.is_active_member(
  target_organization_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as member
    where member.organization_id = target_organization_id
      and member.user_id = target_user_id
      and member.status = 'active'
  );
$$;

create function app_private.has_organization_role(
  target_organization_id uuid,
  allowed_roles public.organization_role[],
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as member
    where member.organization_id = target_organization_id
      and member.user_id = target_user_id
      and member.status = 'active'
      and member.role = any(allowed_roles)
  );
$$;

create function app_private.shares_active_organization(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members as current_member
    join public.organization_members as target_member
      on target_member.organization_id = current_member.organization_id
    where current_member.user_id = auth.uid()
      and current_member.status = 'active'
      and target_member.user_id = target_user_id
      and target_member.status = 'active'
  );
$$;

revoke all on function app_private.is_active_member(uuid, uuid) from public;
revoke all on function app_private.has_organization_role(uuid, public.organization_role[], uuid) from public;
revoke all on function app_private.shares_active_organization(uuid) from public;
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_active_member(uuid, uuid) to authenticated;
grant execute on function app_private.has_organization_role(uuid, public.organization_role[], uuid) to authenticated;
grant execute on function app_private.shares_active_organization(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;

create policy profiles_select_shared_organization
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or app_private.shares_active_organization(id)
);

create policy profiles_update_self
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy organizations_select_member
on public.organizations
for select
to authenticated
using (app_private.is_active_member(id));

create policy organizations_update_manager
on public.organizations
for update
to authenticated
using (
  app_private.has_organization_role(
    id,
    array['owner', 'admin']::public.organization_role[]
  )
)
with check (
  app_private.has_organization_role(
    id,
    array['owner', 'admin']::public.organization_role[]
  )
);

create policy organization_members_select_member
on public.organization_members
for select
to authenticated
using (app_private.is_active_member(organization_id));

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.organizations from anon, authenticated;
revoke all on table public.organization_members from anon, authenticated;
revoke all on table public.organization_invitations from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name) on table public.profiles to authenticated;
grant select on table public.organizations to authenticated;
grant update (name) on table public.organizations to authenticated;
grant select on table public.organization_members to authenticated;

create function public.create_organization(organization_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_name text := btrim(organization_name);
  new_organization_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if organization_name is null
    or char_length(normalized_name) not between 2 and 120
  then
    raise exception 'Organization name must contain between 2 and 120 characters'
      using errcode = '22023';
  end if;

  insert into public.organizations (name, created_by)
  values (normalized_name, current_user_id)
  returning id into new_organization_id;

  insert into public.organization_members (
    organization_id,
    user_id,
    role,
    status,
    added_by
  )
  values (
    new_organization_id,
    current_user_id,
    'owner',
    'active',
    current_user_id
  );

  return new_organization_id;
end;
$$;

create function public.create_organization_invitation(
  target_organization_id uuid,
  target_email text,
  target_role public.organization_role
)
returns table (token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  actor_role public.organization_role;
  normalized_email text := lower(btrim(target_email));
  invitation_token text := encode(extensions.gen_random_bytes(32), 'hex');
  invitation_expiry timestamptz := now() + interval '7 days';
begin
  if target_organization_id is null or target_email is null or target_role is null then
    raise exception 'Organization, email and role are required' using errcode = '22023';
  end if;

  if not app_private.has_organization_role(
    target_organization_id,
    array['owner', 'admin']::public.organization_role[]
  ) then
    raise exception 'Insufficient permission to invite members' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text, 0)
  );

  select member.role
  into actor_role
  from public.organization_members as member
  where member.organization_id = target_organization_id
    and member.user_id = actor_id
    and member.status = 'active';

  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'Insufficient permission to invite members' using errcode = '42501';
  end if;

  if target_role = 'owner' then
    raise exception 'Ownership can only be granted through transfer'
      using errcode = '42501';
  end if;

  if normalized_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' then
    raise exception 'A valid email is required' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.organization_members as member
    join auth.users as users on users.id = member.user_id
    where member.organization_id = target_organization_id
      and member.status = 'active'
      and lower(users.email) = normalized_email
  ) then
    raise exception 'The user is already an active member' using errcode = '23505';
  end if;

  update public.organization_invitations as invitation
  set revoked_at = now()
  where invitation.organization_id = target_organization_id
    and invitation.email = normalized_email
    and invitation.accepted_at is null
    and invitation.revoked_at is null;

  insert into public.organization_invitations (
    organization_id,
    email,
    role,
    token_hash,
    invited_by,
    expires_at
  )
  values (
    target_organization_id,
    normalized_email,
    target_role,
    encode(extensions.digest(invitation_token, 'sha256'), 'hex'),
    actor_id,
    invitation_expiry
  );

  return query select invitation_token, invitation_expiry;
end;
$$;

create function public.accept_organization_invitation(invitation_token text)
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
  where users.id = current_user_id
    and users.email_confirmed_at is not null;

  if current_email is null then
    raise exception 'A confirmed email is required' using errcode = '42501';
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

  if current_email = '' or current_email <> invitation.email then
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

create function public.list_organization_invitations(target_organization_id uuid)
returns table (
  invitation_id uuid,
  email text,
  role public.organization_role,
  expires_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_organization_id is null then
    raise exception 'Organization is required' using errcode = '22023';
  end if;

  if not app_private.has_organization_role(
    target_organization_id,
    array['owner', 'admin']::public.organization_role[]
  ) then
    raise exception 'Insufficient permission to view invitations' using errcode = '42501';
  end if;

  return query
  select
    invitation.id,
    invitation.email,
    invitation.role,
    invitation.expires_at,
    invitation.created_at
  from public.organization_invitations as invitation
  where invitation.organization_id = target_organization_id
    and invitation.accepted_at is null
    and invitation.revoked_at is null
    and invitation.expires_at > now()
  order by invitation.created_at desc;
end;
$$;

create function public.revoke_organization_invitation(
  target_organization_id uuid,
  target_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_organization_id is null or target_invitation_id is null then
    raise exception 'Organization and invitation are required' using errcode = '22023';
  end if;

  if not app_private.has_organization_role(
    target_organization_id,
    array['owner', 'admin']::public.organization_role[]
  ) then
    raise exception 'Insufficient permission to revoke invitations' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text, 0)
  );

  if not app_private.has_organization_role(
    target_organization_id,
    array['owner', 'admin']::public.organization_role[]
  ) then
    raise exception 'Insufficient permission to revoke invitations' using errcode = '42501';
  end if;

  update public.organization_invitations
  set revoked_at = now()
  where id = target_invitation_id
    and organization_id = target_organization_id
    and accepted_at is null
    and revoked_at is null;

  if not found then
    raise exception 'Pending invitation not found' using errcode = 'P0002';
  end if;
end;
$$;

create function public.update_organization_member_role(
  target_organization_id uuid,
  target_user_id uuid,
  target_role public.organization_role
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role public.organization_role;
  current_target_role public.organization_role;
begin
  if target_organization_id is null or target_user_id is null or target_role is null then
    raise exception 'Organization, member and role are required' using errcode = '22023';
  end if;

  if not app_private.has_organization_role(
    target_organization_id,
    array['owner', 'admin']::public.organization_role[]
  ) then
    raise exception 'Insufficient permission to manage members' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text, 0)
  );

  select member.role
  into actor_role
  from public.organization_members as member
  where member.organization_id = target_organization_id
    and member.user_id = auth.uid()
    and member.status = 'active';

  select member.role
  into current_target_role
  from public.organization_members as member
  where member.organization_id = target_organization_id
    and member.user_id = target_user_id
    and member.status = 'active'
  for update;

  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'Insufficient permission to manage members' using errcode = '42501';
  end if;

  if current_target_role is null then
    raise exception 'Active member not found' using errcode = 'P0002';
  end if;

  if current_target_role = 'owner' or target_role = 'owner' then
    raise exception 'Ownership changes require the transfer operation'
      using errcode = '42501';
  end if;

  update public.organization_members
  set role = target_role
  where organization_id = target_organization_id
    and user_id = target_user_id;

  if target_role not in ('owner', 'admin') then
    update public.organization_invitations
    set revoked_at = now()
    where organization_id = target_organization_id
      and invited_by = target_user_id
      and accepted_at is null
      and revoked_at is null;
  end if;
end;
$$;

create function public.remove_organization_member(
  target_organization_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role public.organization_role;
  target_member_role public.organization_role;
begin
  if target_organization_id is null or target_user_id is null then
    raise exception 'Organization and member are required' using errcode = '22023';
  end if;

  if not app_private.has_organization_role(
    target_organization_id,
    array['owner', 'admin']::public.organization_role[]
  ) then
    raise exception 'Insufficient permission to manage members' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text, 0)
  );

  select member.role
  into actor_role
  from public.organization_members as member
  where member.organization_id = target_organization_id
    and member.user_id = auth.uid()
    and member.status = 'active';

  select member.role
  into target_member_role
  from public.organization_members as member
  where member.organization_id = target_organization_id
    and member.user_id = target_user_id
    and member.status = 'active'
  for update;

  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'Insufficient permission to manage members' using errcode = '42501';
  end if;

  if target_member_role is null then
    raise exception 'Active member not found' using errcode = 'P0002';
  end if;

  if target_member_role = 'owner' then
    raise exception 'The owner must transfer ownership before leaving'
      using errcode = '42501';
  end if;

  update public.organization_members
  set status = 'removed'
  where organization_id = target_organization_id
    and user_id = target_user_id;

  update public.organization_invitations
  set revoked_at = now()
  where organization_id = target_organization_id
    and invited_by = target_user_id
    and accepted_at is null
    and revoked_at is null;
end;
$$;

create function public.transfer_organization_ownership(
  target_organization_id uuid,
  next_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_owner_id uuid := auth.uid();
begin
  if target_organization_id is null or next_owner_id is null then
    raise exception 'Organization and next owner are required' using errcode = '22023';
  end if;

  if not app_private.has_organization_role(
    target_organization_id,
    array['owner']::public.organization_role[],
    current_owner_id
  ) then
    raise exception 'Only the owner can transfer ownership' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text, 0)
  );

  if current_owner_id = next_owner_id then
    raise exception 'The selected member already owns the organization'
      using errcode = '22023';
  end if;

  if not app_private.has_organization_role(
    target_organization_id,
    array['owner']::public.organization_role[],
    current_owner_id
  ) then
    raise exception 'Only the owner can transfer ownership' using errcode = '42501';
  end if;

  if not app_private.is_active_member(target_organization_id, next_owner_id) then
    raise exception 'The next owner must be an active member' using errcode = '22023';
  end if;

  update public.organization_members
  set role = 'admin'
  where organization_id = target_organization_id
    and user_id = current_owner_id;

  update public.organization_members
  set role = 'owner'
  where organization_id = target_organization_id
    and user_id = next_owner_id
    and status = 'active';

  if not found then
    raise exception 'The next owner is no longer active' using errcode = '22023';
  end if;
end;
$$;

revoke all on function public.create_organization(text) from public, anon, authenticated;
revoke all on function public.create_organization_invitation(uuid, text, public.organization_role) from public, anon, authenticated;
revoke all on function public.accept_organization_invitation(text) from public, anon, authenticated;
revoke all on function public.list_organization_invitations(uuid) from public, anon, authenticated;
revoke all on function public.revoke_organization_invitation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.update_organization_member_role(uuid, uuid, public.organization_role) from public, anon, authenticated;
revoke all on function public.remove_organization_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.transfer_organization_ownership(uuid, uuid) from public, anon, authenticated;

grant execute on function public.create_organization(text) to authenticated;
grant execute on function public.create_organization_invitation(uuid, text, public.organization_role) to authenticated;
grant execute on function public.accept_organization_invitation(text) to authenticated;
grant execute on function public.list_organization_invitations(uuid) to authenticated;
grant execute on function public.revoke_organization_invitation(uuid, uuid) to authenticated;
grant execute on function public.update_organization_member_role(uuid, uuid, public.organization_role) to authenticated;
grant execute on function public.remove_organization_member(uuid, uuid) to authenticated;
grant execute on function public.transfer_organization_ownership(uuid, uuid) to authenticated;
