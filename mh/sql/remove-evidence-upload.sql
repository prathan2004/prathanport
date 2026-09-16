-- Optional cleanup if an older version with image evidence upload was already applied.
-- Run only if you previously created the evidence column / Storage policies and want to remove them.
--
-- Important:
-- Supabase does not allow direct DELETE from storage.objects or storage.buckets.
-- If the running-evidence bucket exists, delete it from:
-- Supabase Dashboard > Storage > running-evidence > Empty bucket > Delete bucket
-- or use the Supabase Storage API from a trusted admin environment.

alter table if exists public.running_records
drop column if exists evidence_url;

drop policy if exists "running_evidence_select_own_or_admin" on storage.objects;
drop policy if exists "running_evidence_insert_own_folder" on storage.objects;
drop policy if exists "running_evidence_update_own_folder" on storage.objects;
drop policy if exists "running_evidence_delete_own_or_admin" on storage.objects;
