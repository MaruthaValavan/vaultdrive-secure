
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.confirm_upload(text,text,text,bigint,uuid,text) to authenticated;
grant execute on function public.soft_delete_file(uuid) to authenticated;
grant execute on function public.hash_link_password(text) to authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
