alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.signatures enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "profiles_delete_own" on public.profiles for delete to authenticated using (user_id = (select auth.uid()));
create policy "documents_select_own" on public.documents for select to authenticated using (user_id = (select auth.uid()));
create policy "documents_insert_own" on public.documents for insert to authenticated with check (user_id = (select auth.uid()));
create policy "documents_update_own" on public.documents for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "documents_delete_own" on public.documents for delete to authenticated using (user_id = (select auth.uid()));
create policy "signatures_select_own" on public.signatures for select to authenticated using (user_id = (select auth.uid()));
create policy "signatures_insert_own" on public.signatures for insert to authenticated with check (user_id = (select auth.uid()));
create policy "signatures_update_own" on public.signatures for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "signatures_delete_own" on public.signatures for delete to authenticated using (user_id = (select auth.uid()));
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('signatures','signatures',false,5242880,array['image/png','image/jpeg','image/webp']),
 ('documents','documents',false,20971520,array['application/pdf'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "storage_select_own" on storage.objects for select to authenticated using
 (bucket_id in ('signatures','documents') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "storage_insert_own" on storage.objects for insert to authenticated with check
 (bucket_id in ('signatures','documents') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "storage_update_own" on storage.objects for update to authenticated using
 (bucket_id in ('signatures','documents') and (storage.foldername(name))[1] = (select auth.uid())::text) with check
 (bucket_id in ('signatures','documents') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "storage_delete_own" on storage.objects for delete to authenticated using
 (bucket_id in ('signatures','documents') and (storage.foldername(name))[1] = (select auth.uid())::text);
