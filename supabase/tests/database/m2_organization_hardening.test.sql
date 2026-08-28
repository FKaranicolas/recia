begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

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
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'crowded@example.com', '', now(), '{}', '{"display_name":"Crowded"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'roomy@example.com', '', now(), '{}', '{"display_name":"Roomy"}', now(), now(), '', '', '', '');

-- The receiving user already owns the maximum number of organizations.
insert into public.organizations (id, name, created_by)
select
  ('c0000000-0000-0000-0000-00000000000' || to_hex(sequence_number))::uuid,
  'Crowded ' || sequence_number,
  '10000000-0000-0000-0000-000000000002'
from generate_series(1, 10) as sequence_number;

insert into public.organization_members (organization_id, user_id, role, added_by)
select
  ('c0000000-0000-0000-0000-00000000000' || to_hex(sequence_number))::uuid,
  '10000000-0000-0000-0000-000000000002',
  'owner',
  '10000000-0000-0000-0000-000000000002'
from generate_series(1, 10) as sequence_number;

insert into public.organizations (id, name, created_by)
values ('a0000000-0000-0000-0000-000000000001', 'Organization A', '10000000-0000-0000-0000-000000000001');

insert into public.organization_members (organization_id, user_id, role, added_by)
values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'admin', '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'admin', '10000000-0000-0000-0000-000000000001');

select is(
  (
    select count(*)
    from public.organization_members as member
    where member.user_id = '10000000-0000-0000-0000-000000000002'
      and member.role = 'owner'
      and member.status = 'active'
  ),
  10::bigint,
  'the receiving user starts at the organization ceiling'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $$
    select public.transfer_organization_ownership(
      'a0000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000002'
    )
  $$,
  'P0001',
  'A user can own at most 10 active organizations',
  'a transfer cannot push the receiver past the organization ceiling'
);

select is(
  (
    select member.role::text
    from public.organization_members as member
    where member.organization_id = 'a0000000-0000-0000-0000-000000000001'
      and member.user_id = '10000000-0000-0000-0000-000000000001'
  ),
  'owner',
  'the refused transfer leaves the current owner in place'
);

select is(
  (
    select member.role::text
    from public.organization_members as member
    where member.organization_id = 'a0000000-0000-0000-0000-000000000001'
      and member.user_id = '10000000-0000-0000-0000-000000000002'
  ),
  'admin',
  'the refused transfer does not promote the receiver'
);

select lives_ok(
  $$
    select public.transfer_organization_ownership(
      'a0000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000003'
    )
  $$,
  'a transfer to a member below the ceiling still succeeds'
);

select is(
  (
    select member.role::text
    from public.organization_members as member
    where member.organization_id = 'a0000000-0000-0000-0000-000000000001'
      and member.user_id = '10000000-0000-0000-0000-000000000003'
  ),
  'owner',
  'the accepted transfer moves ownership'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$ select public.create_organization('Una mas') $$,
  'P0001',
  'A user can own at most 10 active organizations',
  'the ceiling still applies when creating an organization'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$ select public.create_organization('Organizacion nueva') $$,
  'creating an organization still works while the owner rule is deferred'
);

reset role;

-- With the constraint made immediate, a privileged insert that skips the owner
-- membership is rejected instead of leaving an organization with no owner.
set constraints organizations_require_owner immediate;

select throws_ok(
  $$
    insert into public.organizations (name, created_by)
    values ('Sin propietario', '10000000-0000-0000-0000-000000000001')
  $$,
  '23514',
  'An organization must have exactly one active owner',
  'a privileged insert cannot leave an organization without an owner'
);

select * from finish();
rollback;
