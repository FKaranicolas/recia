begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(19);

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
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'roomy@example.com', '', now(), '{}', '{"display_name":"Roomy"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'near-transfer@example.com', '', now(), '{}', '{"display_name":"Near Transfer"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'near-create@example.com', '', now(), '{}', '{"display_name":"Near Create"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'owner-b@example.com', '', now(), '{}', '{"display_name":"Owner B"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'owner-c@example.com', '', now(), '{}', '{"display_name":"Owner C"}', now(), now(), '', '', '', '');

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

-- Two users sit exactly one ownership below the ceiling to cover the 9 -> 10 boundary.
insert into public.organizations (id, name, created_by)
select
  ('d0000000-0000-0000-0000-00000000000' || to_hex(sequence_number))::uuid,
  'Near transfer ' || sequence_number,
  '10000000-0000-0000-0000-000000000004'
from generate_series(1, 9) as sequence_number;

insert into public.organization_members (organization_id, user_id, role, added_by)
select
  ('d0000000-0000-0000-0000-00000000000' || to_hex(sequence_number))::uuid,
  '10000000-0000-0000-0000-000000000004',
  'owner',
  '10000000-0000-0000-0000-000000000004'
from generate_series(1, 9) as sequence_number;

insert into public.organizations (id, name, created_by)
select
  ('e0000000-0000-0000-0000-00000000000' || to_hex(sequence_number))::uuid,
  'Near create ' || sequence_number,
  '10000000-0000-0000-0000-000000000005'
from generate_series(1, 9) as sequence_number;

insert into public.organization_members (organization_id, user_id, role, added_by)
select
  ('e0000000-0000-0000-0000-00000000000' || to_hex(sequence_number))::uuid,
  '10000000-0000-0000-0000-000000000005',
  'owner',
  '10000000-0000-0000-0000-000000000005'
from generate_series(1, 9) as sequence_number;

insert into public.organizations (id, name, created_by)
values
  ('a0000000-0000-0000-0000-000000000001', 'Organization A', '10000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000001', 'Organization B', '10000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', 'Admin host', '10000000-0000-0000-0000-000000000006'),
  ('b0000000-0000-0000-0000-000000000003', 'Operator host', '10000000-0000-0000-0000-000000000006'),
  ('b0000000-0000-0000-0000-000000000004', 'Viewer host', '10000000-0000-0000-0000-000000000006');

insert into public.organization_members (organization_id, user_id, role, added_by)
values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'admin', '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'admin', '10000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', '10000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'admin', '10000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 'owner', '10000000-0000-0000-0000-000000000006'),
  ('b0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000006', 'owner', '10000000-0000-0000-0000-000000000006'),
  ('b0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000006', 'owner', '10000000-0000-0000-0000-000000000006');

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

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$
    select public.transfer_organization_ownership(
      'b0000000-0000-0000-0000-000000000001',
      '10000000-0000-0000-0000-000000000004'
    )
  $$,
  'a transfer can move a user from nine to ten active owned organizations'
);

-- Counted with the role reset: this asserts the ownership invariant itself, not
-- what any particular caller is allowed to see. Under `authenticated` the count
-- would be filtered by RLS to the organizations the current JWT belongs to.
reset role;

select is(
  (
    select count(*)
    from public.organization_members as member
    where member.user_id = '10000000-0000-0000-0000-000000000004'
      and member.role = 'owner'
      and member.status = 'active'
  ),
  10::bigint,
  'the accepted boundary transfer leaves the receiver at ten owned organizations'
);

set local role authenticated;
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

select is(
  (
    select count(*)
    from public.organization_members as member
    join public.organizations as organization
      on organization.id = member.organization_id
    where organization.name = 'Organizacion nueva'
      and member.user_id = '10000000-0000-0000-0000-000000000003'
      and member.role = 'owner'
      and member.status = 'active'
  ),
  1::bigint,
  'create_organization leaves exactly one active owner on the new organization'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);
select lives_ok(
  $$ select public.create_organization('Decima exacta') $$,
  'create_organization allows the exact tenth active ownership'
);

select is(
  (
    select count(*)
    from public.organization_members as member
    where member.user_id = '10000000-0000-0000-0000-000000000005'
      and member.role = 'owner'
      and member.status = 'active'
  ),
  10::bigint,
  'the exact-limit creation leaves the user at ten owned organizations'
);

reset role;

select lives_ok(
  $$
    insert into public.organization_members (organization_id, user_id, role, added_by)
    values ('b0000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'admin', '10000000-0000-0000-0000-000000000006')
  $$,
  'admin memberships do not consume the active ownership ceiling'
);

select lives_ok(
  $$
    insert into public.organization_members (organization_id, user_id, role, added_by)
    values ('b0000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'operator', '10000000-0000-0000-0000-000000000006')
  $$,
  'operator memberships do not consume the active ownership ceiling'
);

select lives_ok(
  $$
    insert into public.organization_members (organization_id, user_id, role, added_by)
    values ('b0000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'viewer', '10000000-0000-0000-0000-000000000006')
  $$,
  'viewer memberships do not consume the active ownership ceiling'
);

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

select lives_ok(
  $$
    set constraints organizations_require_owner deferred;

    insert into public.organizations (id, name, created_by)
    values ('f0000000-0000-0000-0000-000000000001', 'Privileged with owner', '10000000-0000-0000-0000-000000000001');

    insert into public.organization_members (organization_id, user_id, role, added_by)
    values ('f0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', '10000000-0000-0000-0000-000000000001');

    set constraints organizations_require_owner immediate;
  $$,
  'a privileged insert with exactly one active owner is accepted'
);

select lives_ok(
  $$
    update public.organizations
    set name = 'Organization B updated'
    where id = 'b0000000-0000-0000-0000-000000000001';

    set constraints organizations_require_owner immediate;
  $$,
  'updating a healthy organization revalidates without blocking'
);

-- Nota: el escenario "quitar al unico propietario es rechazado" no se prueba
-- aca. Esa ruta la corta `organization_members_require_owner`, el constraint
-- trigger diferido de M2 sobre `organization_members`, no el trigger nuevo
-- sobre `organizations`. Para llegar a que el trigger nuevo sea la barrera hay
-- que deshabilitar el de M2, y Postgres lo prohibe con
-- `55006: cannot ALTER TABLE ... because it has pending trigger events`.

select * from finish();
rollback;
