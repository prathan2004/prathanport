create table if not exists public.pdf_workflows (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 file_name text not null,
 source_path text not null,
 output_path text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists pdf_workflows_user_created_idx on public.pdf_workflows(user_id,created_at desc);
alter table public.pdf_workflows enable row level security;
create policy "pdf_workflows_select_own" on public.pdf_workflows for select to authenticated using (user_id = (select auth.uid()));
create policy "pdf_workflows_insert_own" on public.pdf_workflows for insert to authenticated with check (user_id = (select auth.uid()));
create policy "pdf_workflows_update_own" on public.pdf_workflows for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "pdf_workflows_delete_own" on public.pdf_workflows for delete to authenticated using (user_id = (select auth.uid()));
