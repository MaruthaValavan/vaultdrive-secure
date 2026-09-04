
create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin','user');
create type public.share_resource as enum ('file','folder');
create type public.share_role as enum ('viewer','editor');
create type public.notification_type as enum ('share_created','share_revoked','quota_warning');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  email text,
  is_suspended boolean not null default false,
  storage_quota_bytes bigint not null default 5368709120,
  storage_used_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create table public.folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.folders(id) on delete cascade,
  name text not null,
  path text not null default '',
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.folders to authenticated;
grant all on public.folders to service_role;
alter table public.folders enable row level security;
create index folders_owner_idx on public.folders(owner_id);
create index folders_parent_idx on public.folders(parent_id);

create table public.files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0,
  checksum text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.files to authenticated;
grant all on public.files to service_role;
alter table public.files enable row level security;
create index files_owner_idx on public.files(owner_id);
create index files_folder_idx on public.files(folder_id);

create table public.shares (
  id uuid primary key default gen_random_uuid(),
  resource_type public.share_resource not null,
  resource_id uuid not null,
  shared_by uuid not null references auth.users(id) on delete cascade,
  shared_with_user_id uuid references auth.users(id) on delete cascade,
  role public.share_role not null default 'viewer',
  link_token text unique,
  link_expires_at timestamptz,
  link_password_hash text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.shares to authenticated;
grant all on public.shares to service_role;
alter table public.shares enable row level security;
create index shares_target_idx on public.shares(shared_with_user_id);
create index shares_resource_idx on public.shares(resource_type, resource_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  type public.notification_type not null,
  resource_id uuid,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;
alter table public.audit_log enable row level security;

-- access helpers -----------------------------------------------------------
create or replace function public.folder_share_role(_folder_id uuid, _uid uuid)
returns public.share_role language sql stable security definer set search_path = public as $$
  select max(s.role::text)::public.share_role
  from public.folders f
  join public.shares s
    on s.resource_type = 'folder'
   and s.shared_with_user_id = _uid
   and (s.resource_id = f.id or f.path like '%' || s.resource_id::text || '%')
  where f.id = _folder_id
$$;

create or replace function public.can_read_folder(_folder_id uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.folders f where f.id = _folder_id and f.owner_id = _uid)
      or public.folder_share_role(_folder_id, _uid) is not null
$$;

create or replace function public.can_edit_folder(_folder_id uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.folders f where f.id = _folder_id and f.owner_id = _uid)
      or public.folder_share_role(_folder_id, _uid) = 'editor'
$$;

create or replace function public.file_access_role(_file_id uuid, _uid uuid)
returns public.share_role language sql stable security definer set search_path = public as $$
  select max(r::text)::public.share_role from (
    select s.role as r
      from public.shares s
     where s.resource_type = 'file' and s.resource_id = _file_id and s.shared_with_user_id = _uid
    union all
    select public.folder_share_role(f.folder_id, _uid)
      from public.files f where f.id = _file_id and f.folder_id is not null
  ) x where r is not null
$$;

create or replace function public.can_read_file(_file_id uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.files f where f.id = _file_id and f.owner_id = _uid)
      or public.file_access_role(_file_id, _uid) is not null
$$;

create or replace function public.can_edit_file(_file_id uuid, _uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.files f where f.id = _file_id and f.owner_id = _uid)
      or public.file_access_role(_file_id, _uid) = 'editor'
$$;

-- policies -----------------------------------------------------------------
create policy "profiles readable by self and admins" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "profiles insert self" on public.profiles for insert to authenticated
  with check (id = auth.uid());
create policy "profiles update self or admin" on public.profiles for update to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "roles readable by self and admins" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "folders select" on public.folders for select to authenticated
  using (owner_id = auth.uid() or public.folder_share_role(id, auth.uid()) is not null);
create policy "folders insert own" on public.folders for insert to authenticated
  with check (owner_id = auth.uid());
create policy "folders update" on public.folders for update to authenticated
  using (owner_id = auth.uid() or public.folder_share_role(id, auth.uid()) = 'editor')
  with check (owner_id = auth.uid() or public.folder_share_role(id, auth.uid()) = 'editor');
create policy "folders delete own" on public.folders for delete to authenticated
  using (owner_id = auth.uid());

create policy "files select" on public.files for select to authenticated
  using (owner_id = auth.uid() or public.file_access_role(id, auth.uid()) is not null);
create policy "files insert own" on public.files for insert to authenticated
  with check (owner_id = auth.uid());
create policy "files update" on public.files for update to authenticated
  using (owner_id = auth.uid() or public.file_access_role(id, auth.uid()) = 'editor')
  with check (owner_id = auth.uid() or public.file_access_role(id, auth.uid()) = 'editor');
create policy "files delete own" on public.files for delete to authenticated
  using (owner_id = auth.uid());

create policy "shares select" on public.shares for select to authenticated
  using (shared_by = auth.uid() or shared_with_user_id = auth.uid());
create policy "shares insert own" on public.shares for insert to authenticated
  with check (shared_by = auth.uid());
create policy "shares delete own" on public.shares for delete to authenticated
  using (shared_by = auth.uid());
create policy "shares update own" on public.shares for update to authenticated
  using (shared_by = auth.uid()) with check (shared_by = auth.uid());

create policy "notifications select own" on public.notifications for select to authenticated
  using (owner_id = auth.uid());
create policy "notifications update own" on public.notifications for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "notifications delete own" on public.notifications for delete to authenticated
  using (owner_id = auth.uid());

create policy "audit readable by admins" on public.audit_log for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

-- triggers -----------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create trigger folders_touch before update on public.folders
  for each row execute function public.touch_updated_at();
create trigger files_touch before update on public.files
  for each row execute function public.touch_updated_at();

create or replace function public.set_folder_path() returns trigger
language plpgsql set search_path = public as $$
declare parent_path text; depth int;
begin
  if new.parent_id is null then
    new.path := '/' || new.id::text;
  else
    select path into parent_path from public.folders where id = new.parent_id;
    if parent_path is null then raise exception 'PARENT_NOT_FOUND'; end if;
    new.path := parent_path || '/' || new.id::text;
  end if;
  depth := array_length(string_to_array(trim(both '/' from new.path), '/'), 1);
  if depth > 20 then raise exception 'MAX_DEPTH_EXCEEDED'; end if;
  return new;
end; $$;

create trigger folders_set_path before insert or update of parent_id on public.folders
  for each row execute function public.set_folder_path();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
          new.email,
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.notify_on_share() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.shared_with_user_id is not null then
    insert into public.notifications (owner_id, type, resource_id, message)
    values (new.shared_with_user_id, 'share_created', new.resource_id,
            'A ' || new.resource_type::text || ' was shared with you as ' || new.role::text);
  end if;
  return new;
end; $$;

create trigger shares_notify after insert on public.shares
  for each row execute function public.notify_on_share();

create or replace function public.notify_on_share_revoke() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.shared_with_user_id is not null then
    insert into public.notifications (owner_id, type, resource_id, message)
    values (old.shared_with_user_id, 'share_revoked', old.resource_id,
            'Access to a ' || old.resource_type::text || ' was revoked');
  end if;
  return old;
end; $$;

create trigger shares_notify_revoke after delete on public.shares
  for each row execute function public.notify_on_share_revoke();

-- quota-aware upload confirmation -------------------------------------------
create or replace function public.confirm_upload(
  p_storage_path text, p_original_name text, p_mime_type text,
  p_size_bytes bigint, p_folder_id uuid default null, p_checksum text default null)
returns public.files language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); prof public.profiles; rec public.files;
begin
  if uid is null then raise exception 'FORBIDDEN'; end if;
  select * into prof from public.profiles where id = uid for update;
  if prof.storage_used_bytes + p_size_bytes > prof.storage_quota_bytes then
    raise exception 'QUOTA_EXCEEDED';
  end if;
  if p_folder_id is not null and not public.can_edit_folder(p_folder_id, uid) then
    raise exception 'FORBIDDEN';
  end if;
  insert into public.files (owner_id, folder_id, storage_path, original_name, mime_type, size_bytes, checksum)
  values (uid, p_folder_id, p_storage_path, p_original_name, p_mime_type, p_size_bytes, p_checksum)
  returning * into rec;
  update public.profiles set storage_used_bytes = storage_used_bytes + p_size_bytes where id = uid;
  if (prof.storage_used_bytes + p_size_bytes)::numeric / nullif(prof.storage_quota_bytes,0) > 0.9 then
    insert into public.notifications (owner_id, type, resource_id, message)
    values (uid, 'quota_warning', rec.id, 'You have used over 90% of your storage quota');
  end if;
  return rec;
end; $$;
grant execute on function public.confirm_upload(text,text,text,bigint,uuid,text) to authenticated;

create or replace function public.soft_delete_file(p_file_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); f public.files;
begin
  select * into f from public.files where id = p_file_id;
  if f is null or f.owner_id <> uid then raise exception 'FORBIDDEN'; end if;
  if f.is_deleted then return; end if;
  update public.files set is_deleted = true where id = p_file_id;
  update public.profiles set storage_used_bytes = greatest(0, storage_used_bytes - f.size_bytes) where id = uid;
end; $$;
grant execute on function public.soft_delete_file(uuid) to authenticated;

create or replace function public.hash_link_password(p_password text)
returns text language sql volatile security definer set search_path = public, extensions as $$
  select extensions.crypt(p_password, extensions.gen_salt('bf'))
$$;
grant execute on function public.hash_link_password(text) to authenticated;

alter publication supabase_realtime add table public.notifications;
