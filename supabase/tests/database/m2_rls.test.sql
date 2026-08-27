begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(26);

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.organizations'::regclass),
  'organizations has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.organization_members'::regclass),
  'organization_members has RLS enabled'
);

select ok(
  not has_table_privilege('authenticated', 'public.organization_members', 'INSERT'),
  'authenticated users cannot insert memberships directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.organization_invitations', 'SELECT'),
  'invitation token hashes are not exposed through the API'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-a@example.com', '', now(), '{}', '{"display_name":"Owner A"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'admin-a@example.com', '', now(), '{}', '{"display_name":"Admin A"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'operator-a@example.com', '', now(), '{}', '{"display_name":"Operator A"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-b@example.com', '', now(), '{}', '{"display_name":"Owner B"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'outsider@example.com', '', now(), '{}', '{"display_name":"Outsider"}', now(), now(), '', '', '', '');

insert into public.organizations (id, name, created_by)
values
  ('a0000000-0000-0000-0000-000000000001', 'Organization A', '10000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000001', 'Organization B', '20000000-0000-0000-0000-000000000001');

insert into public.organization_members (organization_id, user_id, role, added_by)
values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'admin', '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'operator', '10000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'owner', '20000000-0000-0000-0000-000000000001');

set constraints organization_members_require_owner immediate;
set local role authenticated;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*) from public.organizations),
  1::bigint,
  'owner A can only read organization A'
);

select is(
  (select count(*) from public.organization_members),
  3::bigint,
  'owner A can only read memberships from organization A'
);

select is(
  (select count(*) from public.profiles),
  3::bigint,
  'owner A cannot read profiles from another organization'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*) from public.organizations),
  1::bigint,
  'owner B can only read organization B'
);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*) from public.organizations),
  0::bigint,
  'an outsider cannot read organizations'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select is_empty(
  $$
    update public.organizations
    set name = 'Compromised B'
    where id = 'b0000000-0000-0000-0000-000000000001'
    returning id
  $$,
  'owner A cannot update organization B'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$
    select public.create_organization_invitation(
      'a0000000-0000-0000-0000-000000000001',
      'invitee@example.com',
      'operator'
    )
  $$,
  'an administrator can create a non-owner invitation'
);

select is(
  (
    select count(*)
    from public.list_organization_invitations(
      'a0000000-0000-0000-0000-000000000001'
    )
  ),
  1::bigint,
  'an administrator can list safe invitation metadata'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$
    select public.create_organization_invitation(
      'a0000000-0000-0000-0000-000000000001',
      'blocked@example.com',
      'operator'
    )
  $$,
  '42501',
  'Insufficient permission to invite members',
  'an operator cannot create invitations'
);

select throws_ok(
  $$
    select public.update_organization_member_role(
      'a0000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002',
      'viewer'
    )
  $$,
  '42501',
  'Insufficient permission to manage members',
  'an operator cannot change roles'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$
    select public.update_organization_member_role(
      'a0000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001',
      'admin'
    )
  $$,
  '42501',
  'Ownership changes require the transfer operation',
  'an administrator cannot demote the owner'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$
    select public.create_organization_invitation(
      'b0000000-0000-0000-0000-000000000001',
      'cross-tenant@example.com',
      'operator'
    )
  $$,
  '42501',
  'Insufficient permission to invite members',
  'owner A cannot create an invitation for organization B'
);

select throws_ok(
  $$
    select public.update_organization_member_role(
      'b0000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001',
      'viewer'
    )
  $$,
  '42501',
  'Insufficient permission to manage members',
  'owner A cannot change a role in organization B'
);

select throws_ok(
  $$
    select public.remove_organization_member(
      'b0000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000001'
    )
  $$,
  '42501',
  'Insufficient permission to manage members',
  'owner A cannot remove a member from organization B'
);

select throws_ok(
  $$
    select public.transfer_organization_ownership(
      'b0000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000001'
    )
  $$,
  '42501',
  'Only the owner can transfer ownership',
  'owner A cannot transfer ownership of organization B'
);

reset role;

insert into public.organization_invitations (
  organization_id,
  email,
  role,
  token_hash,
  invited_by,
  expires_at,
  revoked_at
)
values
  (
    'b0000000-0000-0000-0000-000000000001',
    'different@example.com',
    'operator',
    encode(extensions.digest(repeat('a', 64), 'sha256'), 'hex'),
    '20000000-0000-0000-0000-000000000001',
    now() + interval '1 day',
    null
  ),
  (
    'b0000000-0000-0000-0000-000000000001',
    'owner-a@example.com',
    'operator',
    encode(extensions.digest(repeat('b', 64), 'sha256'), 'hex'),
    '20000000-0000-0000-0000-000000000001',
    now() + interval '1 day',
    now()
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $$ select public.accept_organization_invitation(repeat('a', 64)) $$,
  '42501',
  'Invitation email does not match the authenticated user',
  'an invitation cannot be accepted by a different email'
);

select throws_ok(
  $$ select public.accept_organization_invitation(repeat('b', 64)) $$,
  '22023',
  'Invitation is invalid or expired',
  'a revoked invitation cannot be accepted'
);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$
    select public.create_organization('Outsider organization ' || sequence_number)
    from generate_series(1, 10) as series(sequence_number)
  $$,
  'a user can own up to 10 active organizations'
);

select throws_ok(
  $$ select public.create_organization('Organization 11') $$,
  'P0001',
  'A user can own at most 10 active organizations',
  'an eleventh active organization is blocked'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$
    select token
    from generate_series(2, 30) as series(sequence_number)
    cross join lateral public.create_organization_invitation(
      'a0000000-0000-0000-0000-000000000001',
      'invitee-' || sequence_number || '@example.com',
      'operator'
    )
  $$,
  'an organization can create up to 30 invitations per hour'
);

select throws_ok(
  $$
    select public.create_organization_invitation(
      'a0000000-0000-0000-0000-000000000001',
      'invitee-31@example.com',
      'operator'
    )
  $$,
  'P0001',
  'An organization can create at most 30 invitations per hour',
  'a thirty-first invitation in one hour is blocked'
);

select * from finish();
rollback;
