create type public.document_status as enum (
  'uploading',
  'stored'
);

create type public.document_derivative_kind as enum (
  'thumbnail',
  'preview_page'
);

create type public.document_derivative_status as enum (
  'pending',
  'ready',
  'failed',
  'unsupported'
);

create function app_private.document_max_bytes(target_mime text)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case target_mime
    when 'application/pdf' then 20971520::bigint
    when 'image/jpeg' then 10485760::bigint
    when 'image/png' then 10485760::bigint
    when 'image/heic' then 10485760::bigint
    when 'image/heif' then 10485760::bigint
    else null::bigint
  end;
$$;

comment on function app_private.document_max_bytes(text) is
  'File size ceiling per accepted type, as decided in DEC-017.';

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  status public.document_status not null default 'uploading',
  storage_path text not null unique,
  original_filename text not null check (
    char_length(btrim(original_filename)) between 1 and 255
  ),
  declared_mime_type text not null check (
    declared_mime_type in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/heic',
      'image/heif'
    )
  ),
  mime_type text check (
    mime_type in (
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/heic',
      'image/heif'
    )
  ),
  byte_size bigint check (byte_size > 0),
  checksum_sha256 text check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  page_count integer check (page_count between 1 and 10),
  width_px integer check (width_px > 0),
  height_px integer check (height_px > 0),
  uploaded_by uuid references auth.users (id) on delete set null,
  derivative_status public.document_derivative_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stored_at timestamptz,
  unique (id, organization_id),
  constraint documents_stored_requires_metadata check (
    status <> 'stored'
    or (
      mime_type is not null
      and byte_size is not null
      and checksum_sha256 is not null
      and stored_at is not null
    )
  ),
  constraint documents_pdf_requires_pages check (
    mime_type is distinct from 'application/pdf'
    or page_count is not null
  ),
  constraint documents_images_require_dimensions check (
    mime_type is null
    or mime_type = 'application/pdf'
    or (width_px is not null and height_px is not null)
  )
);

comment on table public.documents is
  'Immutable originals uploaded per organization. Metadata is verified server-side before a row reaches the stored status.';

create table public.document_derivatives (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null,
  organization_id uuid not null,
  kind public.document_derivative_kind not null,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size bigint not null check (byte_size > 0),
  width_px integer check (width_px > 0),
  height_px integer check (height_px > 0),
  page integer check (page >= 1),
  created_at timestamptz not null default now(),
  foreign key (document_id, organization_id)
    references public.documents (id, organization_id)
    on delete cascade,
  unique nulls not distinct (document_id, kind, page)
);

comment on table public.document_derivatives is
  'Thumbnails and conversions kept apart from the original, as required by DEC-007.';

create unique index documents_active_checksum_idx
  on public.documents (organization_id, checksum_sha256)
  where status = 'stored';

create index documents_organization_idx
  on public.documents (organization_id, created_at desc);

create index documents_pending_uploads_idx
  on public.documents (created_at)
  where status = 'uploading';

create index documents_uploaded_by_idx
  on public.documents (uploaded_by);

create index document_derivatives_document_idx
  on public.document_derivatives (document_id);

create trigger documents_set_updated_at
before update on public.documents
for each row execute function app_private.set_updated_at();

create function app_private.prevent_document_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id <> old.organization_id
    or new.storage_path <> old.storage_path
  then
    raise exception 'Document identity cannot be changed' using errcode = '22023';
  end if;

  if old.status = 'stored' and (
    new.checksum_sha256 is distinct from old.checksum_sha256
    or new.byte_size is distinct from old.byte_size
    or new.mime_type is distinct from old.mime_type
  ) then
    raise exception 'A stored original cannot be rewritten' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function app_private.prevent_document_identity_change() from public;

create trigger documents_keep_identity
before update on public.documents
for each row execute function app_private.prevent_document_identity_change();

alter table public.documents enable row level security;
alter table public.document_derivatives enable row level security;

create policy documents_select_member
on public.documents
for select
to authenticated
using (app_private.is_active_member(organization_id));

create policy document_derivatives_select_member
on public.document_derivatives
for select
to authenticated
using (app_private.is_active_member(organization_id));

revoke all on table public.documents from anon, authenticated;
revoke all on table public.document_derivatives from anon, authenticated;

grant select on table public.documents to authenticated;
grant select on table public.document_derivatives to authenticated;

create function public.create_document_upload(
  target_organization_id uuid,
  target_filename text,
  declared_mime text,
  declared_bytes bigint
)
returns table (document_id uuid, storage_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
  normalized_filename text := btrim(coalesce(target_filename, ''));
  new_document_id uuid := pg_catalog.gen_random_uuid();
  new_storage_path text;
  pending_uploads integer;
begin
  if actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if target_organization_id is null or declared_mime is null or declared_bytes is null then
    raise exception 'Organization, file type and size are required' using errcode = '22023';
  end if;

  if not app_private.has_organization_role(
    target_organization_id,
    array['owner', 'admin', 'operator']::public.organization_role[]
  ) then
    raise exception 'Insufficient permission to upload documents' using errcode = '42501';
  end if;

  if char_length(normalized_filename) not between 1 and 255 then
    raise exception 'The file name must contain between 1 and 255 characters'
      using errcode = '22023';
  end if;

  if app_private.document_max_bytes(declared_mime) is null then
    raise exception 'Unsupported file type' using errcode = '22023';
  end if;

  if declared_bytes <= 0 or declared_bytes > app_private.document_max_bytes(declared_mime) then
    raise exception 'The file exceeds the size limit for its type' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text, 2)
  );

  select count(*)
  into pending_uploads
  from public.documents as document
  where document.organization_id = target_organization_id
    and document.status = 'uploading'
    and document.created_at > now() - interval '30 minutes';

  if pending_uploads >= 20 then
    raise exception 'Too many uploads are already in progress' using errcode = 'P0001';
  end if;

  new_storage_path := target_organization_id::text || '/' || new_document_id::text || '/original';

  insert into public.documents (
    id,
    organization_id,
    status,
    storage_path,
    original_filename,
    declared_mime_type,
    uploaded_by
  )
  values (
    new_document_id,
    target_organization_id,
    'uploading',
    new_storage_path,
    normalized_filename,
    declared_mime,
    actor_id
  );

  return query select new_document_id, new_storage_path;
end;
$$;

create function public.finalize_document_upload(
  target_document_id uuid,
  resolved_mime text,
  resolved_bytes bigint,
  resolved_checksum text,
  resolved_page_count integer default null,
  resolved_width integer default null,
  resolved_height integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
  current_status public.document_status;
begin
  if target_document_id is null
    or resolved_mime is null
    or resolved_bytes is null
    or resolved_checksum is null
  then
    raise exception 'Document, type, size and checksum are required' using errcode = '22023';
  end if;

  select document.organization_id, document.status
  into target_organization_id, current_status
  from public.documents as document
  where document.id = target_document_id;

  if target_organization_id is null then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;

  if not app_private.has_organization_role(
    target_organization_id,
    array['owner', 'admin', 'operator']::public.organization_role[]
  ) then
    raise exception 'Insufficient permission to upload documents' using errcode = '42501';
  end if;

  if app_private.document_max_bytes(resolved_mime) is null then
    raise exception 'Unsupported file type' using errcode = '22023';
  end if;

  if resolved_bytes <= 0 or resolved_bytes > app_private.document_max_bytes(resolved_mime) then
    raise exception 'The file exceeds the size limit for its type' using errcode = '22023';
  end if;

  if resolved_checksum !~ '^[0-9a-f]{64}$' then
    raise exception 'The checksum must be a SHA-256 digest in hexadecimal' using errcode = '22023';
  end if;

  if resolved_mime = 'application/pdf' then
    if resolved_page_count is null or resolved_page_count not between 1 and 10 then
      raise exception 'A PDF must contain between 1 and 10 pages' using errcode = '22023';
    end if;
  else
    if resolved_width is null or resolved_height is null then
      raise exception 'Image dimensions are required' using errcode = '22023';
    end if;

    if resolved_width::bigint * resolved_height::bigint > 40000000 then
      raise exception 'The image exceeds 40 megapixels' using errcode = '22023';
    end if;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_organization_id::text, 2)
  );

  select document.status
  into current_status
  from public.documents as document
  where document.id = target_document_id
  for update;

  if current_status is distinct from 'uploading' then
    raise exception 'The upload is no longer pending' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.documents as document
    where document.organization_id = target_organization_id
      and document.checksum_sha256 = resolved_checksum
      and document.status = 'stored'
  ) then
    raise exception 'A document with the same content already exists'
      using errcode = '23505';
  end if;

  update public.documents
  set
    status = 'stored',
    mime_type = resolved_mime,
    byte_size = resolved_bytes,
    checksum_sha256 = resolved_checksum,
    page_count = case when resolved_mime = 'application/pdf' then resolved_page_count else null end,
    width_px = case when resolved_mime = 'application/pdf' then null else resolved_width end,
    height_px = case when resolved_mime = 'application/pdf' then null else resolved_height end,
    stored_at = now()
  where id = target_document_id;
end;
$$;

create function public.discard_document_upload(target_document_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
  discarded_path text;
begin
  if target_document_id is null then
    raise exception 'Document is required' using errcode = '22023';
  end if;

  select document.organization_id
  into target_organization_id
  from public.documents as document
  where document.id = target_document_id;

  if target_organization_id is null then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;

  if not app_private.has_organization_role(
    target_organization_id,
    array['owner', 'admin', 'operator']::public.organization_role[]
  ) then
    raise exception 'Insufficient permission to upload documents' using errcode = '42501';
  end if;

  delete from public.documents
  where id = target_document_id
    and status = 'uploading'
  returning storage_path into discarded_path;

  if discarded_path is null then
    raise exception 'The upload is no longer pending' using errcode = '22023';
  end if;

  return discarded_path;
end;
$$;

create function public.expire_stale_document_uploads(target_organization_id uuid)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_organization_id is null then
    raise exception 'Organization is required' using errcode = '22023';
  end if;

  if not app_private.is_active_member(target_organization_id) then
    raise exception 'Insufficient permission to read this organization' using errcode = '42501';
  end if;

  return query
  delete from public.documents
  where organization_id = target_organization_id
    and status = 'uploading'
    and created_at < now() - interval '30 minutes'
  returning storage_path;
end;
$$;

create function public.find_document_by_checksum(
  target_organization_id uuid,
  target_checksum text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_document_id uuid;
begin
  if target_organization_id is null or target_checksum is null then
    raise exception 'Organization and checksum are required' using errcode = '22023';
  end if;

  if not app_private.is_active_member(target_organization_id) then
    raise exception 'Insufficient permission to read this organization' using errcode = '42501';
  end if;

  select document.id
  into existing_document_id
  from public.documents as document
  where document.organization_id = target_organization_id
    and document.checksum_sha256 = target_checksum
    and document.status = 'stored';

  return existing_document_id;
end;
$$;

create function public.register_document_derivative(
  target_document_id uuid,
  target_kind public.document_derivative_kind,
  target_storage_path text,
  target_mime text,
  target_bytes bigint,
  target_width integer default null,
  target_height integer default null,
  target_page integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
begin
  if target_document_id is null
    or target_kind is null
    or target_storage_path is null
    or target_mime is null
    or target_bytes is null
  then
    raise exception 'Document, kind, path, type and size are required' using errcode = '22023';
  end if;

  select document.organization_id
  into target_organization_id
  from public.documents as document
  where document.id = target_document_id
    and document.status = 'stored';

  if target_organization_id is null then
    raise exception 'Stored document not found' using errcode = 'P0002';
  end if;

  insert into public.document_derivatives (
    document_id,
    organization_id,
    kind,
    storage_path,
    mime_type,
    byte_size,
    width_px,
    height_px,
    page
  )
  values (
    target_document_id,
    target_organization_id,
    target_kind,
    target_storage_path,
    target_mime,
    target_bytes,
    target_width,
    target_height,
    target_page
  )
  on conflict (document_id, kind, page) do update
  set
    storage_path = excluded.storage_path,
    mime_type = excluded.mime_type,
    byte_size = excluded.byte_size,
    width_px = excluded.width_px,
    height_px = excluded.height_px,
    created_at = now();
end;
$$;

create function public.set_document_derivative_status(
  target_document_id uuid,
  next_status public.document_derivative_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_document_id is null or next_status is null then
    raise exception 'Document and status are required' using errcode = '22023';
  end if;

  update public.documents
  set derivative_status = next_status
  where id = target_document_id;

  if not found then
    raise exception 'Document not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.create_document_upload(uuid, text, text, bigint) from public, anon, authenticated;
revoke all on function public.finalize_document_upload(uuid, text, bigint, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.discard_document_upload(uuid) from public, anon, authenticated;
revoke all on function public.expire_stale_document_uploads(uuid) from public, anon, authenticated;
revoke all on function public.find_document_by_checksum(uuid, text) from public, anon, authenticated;
revoke all on function public.register_document_derivative(uuid, public.document_derivative_kind, text, text, bigint, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.set_document_derivative_status(uuid, public.document_derivative_status) from public, anon, authenticated;

grant execute on function public.create_document_upload(uuid, text, text, bigint) to authenticated;
grant execute on function public.finalize_document_upload(uuid, text, bigint, text, integer, integer, integer) to authenticated;
grant execute on function public.discard_document_upload(uuid) to authenticated;
grant execute on function public.expire_stale_document_uploads(uuid) to authenticated;
grant execute on function public.find_document_by_checksum(uuid, text) to authenticated;
grant execute on function public.register_document_derivative(uuid, public.document_derivative_kind, text, text, bigint, integer, integer, integer) to service_role;
grant execute on function public.set_document_derivative_status(uuid, public.document_derivative_status) to service_role;

create function app_private.storage_organization_id(object_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when pg_catalog.split_part(coalesce(object_name, ''), '/', 1)
      ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then pg_catalog.split_part(object_name, '/', 1)::uuid
    else null::uuid
  end;
$$;

comment on function app_private.storage_organization_id(text) is
  'First path segment of a storage object, cast to an organization id only when it is a valid uuid.';

revoke all on function app_private.storage_organization_id(text) from public;
grant execute on function app_private.storage_organization_id(text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'documents',
    'documents',
    false,
    20971520,
    array[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/heic',
      'image/heif'
    ]
  ),
  (
    'document-derivatives',
    'document-derivatives',
    false,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do nothing;

create policy documents_objects_select_member
on storage.objects
for select
to authenticated
using (
  bucket_id = 'documents'
  and app_private.is_active_member(app_private.storage_organization_id(name))
);

create policy documents_objects_insert_uploader
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'documents'
  and app_private.has_organization_role(
    app_private.storage_organization_id(name),
    array['owner', 'admin', 'operator']::public.organization_role[]
  )
  and exists (
    select 1
    from public.documents as document
    where document.storage_path = storage.objects.name
      and document.organization_id = app_private.storage_organization_id(storage.objects.name)
      and document.status = 'uploading'
  )
);

create policy document_derivatives_objects_select_member
on storage.objects
for select
to authenticated
using (
  bucket_id = 'document-derivatives'
  and app_private.is_active_member(app_private.storage_organization_id(name))
);
