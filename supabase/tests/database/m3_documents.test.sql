begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(41);

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.documents'::regclass),
  'documents has RLS enabled'
);

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.document_derivatives'::regclass),
  'document_derivatives has RLS enabled'
);

select ok(
  not has_table_privilege('authenticated', 'public.documents', 'INSERT'),
  'authenticated users cannot insert documents directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.documents', 'UPDATE'),
  'authenticated users cannot update documents directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.documents', 'DELETE'),
  'authenticated users cannot delete documents directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.document_derivatives', 'INSERT'),
  'authenticated users cannot insert derivatives directly'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.register_document_derivative(uuid, public.document_derivative_kind, text, text, bigint, integer, integer, integer)',
    'EXECUTE'
  ),
  'authenticated users cannot register derivatives'
);

select ok(
  not has_function_privilege(
    'authenticated',
    'public.set_document_derivative_status(uuid, public.document_derivative_status)',
    'EXECUTE'
  ),
  'authenticated users cannot change the derivative status'
);

select ok(
  has_function_privilege(
    'service_role',
    'public.register_document_derivative(uuid, public.document_derivative_kind, text, text, bigint, integer, integer, integer)',
    'EXECUTE'
  ),
  'the server role can register derivatives'
);

select is(
  (select count(*) from storage.buckets where id in ('documents', 'document-derivatives') and public),
  0::bigint,
  'no document bucket is public'
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
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'operator-a@example.com', '', now(), '{}', '{"display_name":"Operator A"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'viewer-a@example.com', '', now(), '{}', '{"display_name":"Viewer A"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'owner-b@example.com', '', now(), '{}', '{"display_name":"Owner B"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '30000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'outsider@example.com', '', now(), '{}', '{"display_name":"Outsider"}', now(), now(), '', '', '', '');

insert into public.organizations (id, name, created_by)
values
  ('a0000000-0000-0000-0000-000000000001', 'Organization A', '10000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000001', 'Organization B', '20000000-0000-0000-0000-000000000001');

insert into public.organization_members (organization_id, user_id, role, added_by)
values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'owner', '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'operator', '10000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'viewer', '10000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'owner', '20000000-0000-0000-0000-000000000001');

insert into public.documents (
  id,
  organization_id,
  status,
  storage_path,
  original_filename,
  declared_mime_type,
  mime_type,
  byte_size,
  checksum_sha256,
  width_px,
  height_px,
  uploaded_by,
  stored_at
)
values
  (
    'd0000000-0000-0000-0000-00000000000a',
    'a0000000-0000-0000-0000-000000000001',
    'stored',
    'a0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-00000000000a/original',
    'factura-a.png',
    'image/png',
    'image/png',
    2048,
    repeat('a', 64),
    320,
    240,
    '10000000-0000-0000-0000-000000000001',
    now()
  ),
  (
    'd0000000-0000-0000-0000-00000000000b',
    'b0000000-0000-0000-0000-000000000001',
    'stored',
    'b0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-00000000000b/original',
    'factura-b.png',
    'image/png',
    'image/png',
    2048,
    repeat('b', 64),
    320,
    240,
    '20000000-0000-0000-0000-000000000001',
    now()
  );

insert into public.document_derivatives (
  document_id,
  organization_id,
  kind,
  storage_path,
  mime_type,
  byte_size,
  width_px,
  height_px
)
values
  (
    'd0000000-0000-0000-0000-00000000000b',
    'b0000000-0000-0000-0000-000000000001',
    'thumbnail',
    'b0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-00000000000b/thumbnail.webp',
    'image/webp',
    512,
    240,
    180
  );

insert into public.documents (
  id,
  organization_id,
  status,
  storage_path,
  original_filename,
  declared_mime_type,
  uploaded_by,
  created_at
)
values
  (
    'd0000000-0000-0000-0000-0000000000a1',
    'a0000000-0000-0000-0000-000000000001',
    'uploading',
    'a0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-0000000000a1/original',
    'pendiente-1.pdf',
    'application/pdf',
    '10000000-0000-0000-0000-000000000003',
    now()
  ),
  (
    'd0000000-0000-0000-0000-0000000000a2',
    'a0000000-0000-0000-0000-000000000001',
    'uploading',
    'a0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-0000000000a2/original',
    'pendiente-2.png',
    'image/png',
    '10000000-0000-0000-0000-000000000003',
    now()
  ),
  (
    'd0000000-0000-0000-0000-0000000000a3',
    'a0000000-0000-0000-0000-000000000001',
    'uploading',
    'a0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-0000000000a3/original',
    'abandonada.png',
    'image/png',
    '10000000-0000-0000-0000-000000000003',
    now() - interval '2 hours'
  ),
  (
    'd0000000-0000-0000-0000-0000000000a4',
    'a0000000-0000-0000-0000-000000000001',
    'uploading',
    'a0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-0000000000a4/original',
    'pendiente-4.png',
    'image/png',
    '10000000-0000-0000-0000-000000000003',
    now()
  ),
  (
    'd0000000-0000-0000-0000-0000000000b1',
    'b0000000-0000-0000-0000-000000000001',
    'uploading',
    'b0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-0000000000b1/original',
    'pendiente-b.png',
    'image/png',
    '20000000-0000-0000-0000-000000000001',
    now()
  );

set constraints organization_members_require_owner immediate;
set local role authenticated;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*) from public.documents),
  5::bigint,
  'owner A only reads documents from organization A'
);

select is(
  (
    select count(*)
    from public.documents
    where id = 'd0000000-0000-0000-0000-00000000000b'
  ),
  0::bigint,
  'owner A cannot read a document from organization B'
);

select is(
  (select count(*) from public.document_derivatives),
  0::bigint,
  'owner A cannot read derivatives from organization B'
);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*) from public.documents),
  0::bigint,
  'an outsider reads no documents at all'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$
    select * from public.create_document_upload(
      'a0000000-0000-0000-0000-000000000001',
      'comprobante.pdf',
      'application/pdf',
      1048576
    )
  $$,
  'an operator can reserve an upload'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select throws_ok(
  $$
    select * from public.create_document_upload(
      'a0000000-0000-0000-0000-000000000001',
      'comprobante.pdf',
      'application/pdf',
      1048576
    )
  $$,
  '42501',
  'Insufficient permission to upload documents',
  'a read only member cannot reserve an upload'
);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$
    select * from public.create_document_upload(
      'a0000000-0000-0000-0000-000000000001',
      'comprobante.pdf',
      'application/pdf',
      1048576
    )
  $$,
  '42501',
  'Insufficient permission to upload documents',
  'an outsider cannot reserve an upload in another organization'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$
    select * from public.create_document_upload(
      'a0000000-0000-0000-0000-000000000001',
      'planilla.xlsx',
      'application/vnd.ms-excel',
      1024
    )
  $$,
  '22023',
  'Unsupported file type',
  'a format outside the contract is refused'
);

select throws_ok(
  $$
    select * from public.create_document_upload(
      'a0000000-0000-0000-0000-000000000001',
      'grande.pdf',
      'application/pdf',
      20971521
    )
  $$,
  '22023',
  'The file exceeds the size limit for its type',
  'a PDF above 20 MB is refused'
);

select throws_ok(
  $$
    select * from public.create_document_upload(
      'a0000000-0000-0000-0000-000000000001',
      'grande.png',
      'image/png',
      10485761
    )
  $$,
  '22023',
  'The file exceeds the size limit for its type',
  'an image above 10 MB is refused'
);

select throws_ok(
  $$
    select public.finalize_document_upload(
      'd0000000-0000-0000-0000-0000000000a1',
      'application/pdf',
      1024,
      'no-es-un-hash',
      1
    )
  $$,
  '22023',
  'The checksum must be a SHA-256 digest in hexadecimal',
  'a malformed checksum is refused'
);

select throws_ok(
  $$
    select public.finalize_document_upload(
      'd0000000-0000-0000-0000-0000000000a1',
      'application/pdf',
      1024,
      repeat('c', 64),
      11
    )
  $$,
  '22023',
  'A PDF must contain between 1 and 10 pages',
  'a PDF with eleven pages is refused'
);

select throws_ok(
  $$
    select public.finalize_document_upload(
      'd0000000-0000-0000-0000-0000000000a2',
      'image/png',
      1024,
      repeat('c', 64),
      null,
      7000,
      6000
    )
  $$,
  '22023',
  'The image exceeds 40 megapixels',
  'an image above 40 megapixels is refused'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$
    select public.finalize_document_upload(
      'd0000000-0000-0000-0000-0000000000a1',
      'application/pdf',
      1024,
      repeat('c', 64),
      1
    )
  $$,
  '42501',
  'Insufficient permission to upload documents',
  'the owner of another organization cannot finalize a foreign upload'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$
    select public.finalize_document_upload(
      'd0000000-0000-0000-0000-0000000000a1',
      'application/pdf',
      1024,
      repeat('c', 64),
      3
    )
  $$,
  'an operator can finalize a pending upload'
);

select is(
  (
    select status::text
    from public.documents
    where id = 'd0000000-0000-0000-0000-0000000000a1'
  ),
  'stored',
  'the finalized upload is archived'
);

select throws_ok(
  $$
    select public.finalize_document_upload(
      'd0000000-0000-0000-0000-0000000000a2',
      'image/png',
      2048,
      repeat('a', 64),
      null,
      320,
      240
    )
  $$,
  '23505',
  'A document with the same content already exists',
  'the same content cannot be archived twice in one organization'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$
    select public.finalize_document_upload(
      'd0000000-0000-0000-0000-0000000000b1',
      'image/png',
      2048,
      repeat('a', 64),
      null,
      320,
      240
    )
  $$,
  'the same content can exist in a different organization'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select throws_ok(
  $$ select public.discard_document_upload('d0000000-0000-0000-0000-0000000000a2') $$,
  '42501',
  'Insufficient permission to upload documents',
  'a read only member cannot discard an upload'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select is(
  (select public.discard_document_upload('d0000000-0000-0000-0000-0000000000a2')),
  'a0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-0000000000a2/original',
  'discarding an upload returns the object to remove'
);

select is(
  (
    select count(*)
    from public.documents
    where id = 'd0000000-0000-0000-0000-0000000000a2'
  ),
  0::bigint,
  'the discarded upload leaves no row behind'
);

select results_eq(
  $$ select public.expire_stale_document_uploads('a0000000-0000-0000-0000-000000000001') $$,
  $$ values ('a0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-0000000000a3/original') $$,
  'only uploads abandoned for more than thirty minutes are expired'
);

select is(
  (select public.find_document_by_checksum(
    'a0000000-0000-0000-0000-000000000001',
    repeat('a', 64)
  )),
  'd0000000-0000-0000-0000-00000000000a'::uuid,
  'a member can locate the document that already holds a checksum'
);

select throws_ok(
  $$
    select public.find_document_by_checksum(
      'b0000000-0000-0000-0000-000000000001',
      repeat('b', 64)
    )
  $$,
  '42501',
  'Insufficient permission to read this organization',
  'a member cannot probe checksums of another organization'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'documents',
      'b0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-0000000000b1/original'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'an operator cannot write into the prefix of another organization'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);
select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'documents',
      'a0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-0000000000a4/original'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'a read only member cannot write objects in their own organization'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'documents',
      'a0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-0000000000a4/original'
    )
  $$,
  'an operator can write exactly the object reserved for a pending upload'
);

select throws_ok(
  $$
    insert into storage.objects (bucket_id, name)
    values (
      'documents',
      'a0000000-0000-0000-0000-000000000001/d0000000-0000-0000-0000-0000000000a9/original'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "objects"',
  'an operator cannot write a path that no pending upload reserved'
);

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*) from storage.objects where bucket_id = 'documents'),
  0::bigint,
  'an outsider cannot list objects of another organization'
);

reset role;

select throws_ok(
  $$
    update public.documents
    set checksum_sha256 = repeat('f', 64)
    where id = 'd0000000-0000-0000-0000-00000000000a'
  $$,
  '22023',
  'A stored original cannot be rewritten',
  'a stored original cannot be rewritten in place'
);

delete from public.organizations where id = 'a0000000-0000-0000-0000-000000000001';

select is(
  (
    select count(*)
    from public.documents
    where organization_id = 'a0000000-0000-0000-0000-000000000001'
  ),
  0::bigint,
  'deleting an organization removes its documents'
);

select * from finish();
rollback;
