
create or replace function public.delete_folder_cascade(p_folder_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); f public.folders; freed bigint;
begin
  select * into f from public.folders where id = p_folder_id;
  if f is null or f.owner_id <> uid then raise exception 'FORBIDDEN'; end if;
  select coalesce(sum(fi.size_bytes),0) into freed
    from public.files fi
    join public.folders fo on fo.id = fi.folder_id
   where fi.owner_id = uid and fi.is_deleted = false
     and (fo.id = f.id or fo.path like f.path || '/%');
  delete from public.folders where id = p_folder_id;
  update public.profiles set storage_used_bytes = greatest(0, storage_used_bytes - freed) where id = uid;
end; $$;
revoke execute on function public.delete_folder_cascade(uuid) from public, anon;
grant execute on function public.delete_folder_cascade(uuid) to authenticated;
