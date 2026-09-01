-- Pre-M3 hardening gate.
--
-- Two invariants of M2 held only on the paths the application happens to use.
-- The organization cap was checked when creating an organization but not when
-- ownership moved, and the single owner rule was enforced from memberships,
-- so an organization inserted directly with privileges could stay active with
-- no owner at all.

create function app_private.enforce_owner_organization_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_ownerships integer;
begin
  if new.role <> 'owner' or new.status <> 'active' then
    return new;
  end if;

  -- Nothing changes for someone who already owns this organization.
  if tg_op = 'UPDATE'
    and old.role = 'owner'
    and old.status = 'active'
  then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.user_id::text, 1)
  );

  select count(*)
  into active_ownerships
  from public.organization_members as member
  where member.user_id = new.user_id
    and member.role = 'owner'
    and member.status = 'active'
    and member.organization_id <> new.organization_id;

  if active_ownerships >= 10 then
    raise exception 'A user can own at most 10 active organizations'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_owner_organization_limit() from public;

create trigger organization_members_limit_owner
before insert or update of role, status on public.organization_members
for each row execute function app_private.enforce_owner_organization_limit();

create function app_private.enforce_organization_has_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_owners integer;
begin
  if not exists (
    select 1
    from public.organizations as organization
    where organization.id = new.id
  ) then
    return null;
  end if;

  select count(*)
  into active_owners
  from public.organization_members as member
  where member.organization_id = new.id
    and member.role = 'owner'
    and member.status = 'active';

  if active_owners <> 1 then
    raise exception 'An organization must have exactly one active owner'
      using errcode = '23514';
  end if;

  return null;
end;
$$;

revoke all on function app_private.enforce_organization_has_owner() from public;

-- Deferred so `create_organization` can insert the organization and its owner
-- membership in one transaction, while a bare insert still fails at commit.
create constraint trigger organizations_require_owner
after insert or update on public.organizations
deferrable initially deferred
for each row execute function app_private.enforce_organization_has_owner();

do $$
declare
  invalid_organization_ids text;
begin
  select string_agg(organization_owner_counts.organization_id::text, ', ' order by organization_owner_counts.organization_id::text)
  into invalid_organization_ids
  from (
    select
      organization.id as organization_id,
      count(member.organization_id) filter (
        where member.role = 'owner'
          and member.status = 'active'
      ) as active_owner_count
    from public.organizations as organization
    left join public.organization_members as member
      on member.organization_id = organization.id
    group by organization.id
    having count(member.organization_id) filter (
      where member.role = 'owner'
        and member.status = 'active'
    ) <> 1
  ) as organization_owner_counts;

  if invalid_organization_ids is not null then
    raise exception 'Existing organizations must have exactly one active owner'
      using errcode = '23514',
        detail = invalid_organization_ids;
  end if;
end;
$$;
