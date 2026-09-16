-- Phase 4 - Row Level Security for MH Running App
-- Run this after phase-03-schema.sql.

alter table public.profiles enable row level security;
alter table public.running_records enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;

-- PROFILES

create policy "profiles_select_active_members"
on public.profiles
for select
to authenticated
using (
  status = 'active'
  or id = auth.uid()
  or public.is_admin()
);

create policy "profiles_update_own_basic_profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "profiles_admin_all"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- RUNNING RECORDS

create policy "running_records_select_own"
on public.running_records
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "running_records_insert_own_pending"
on public.running_records
for insert
to authenticated
with check (
  user_id = auth.uid()
  and status = 'pending'
  and public.is_active_member()
  and exists (
    select 1
    from public.challenges c
    where c.is_current_challenge = true
      and run_date between c.start_date and c.end_date
  )
);

create policy "running_records_update_own_pending_or_rejected"
on public.running_records
for update
to authenticated
using (
  user_id = auth.uid()
  and status in ('pending', 'rejected')
)
with check (
  user_id = auth.uid()
  and status = 'pending'
  and exists (
    select 1
    from public.challenges c
    where c.is_current_challenge = true
      and run_date between c.start_date and c.end_date
  )
);

create policy "running_records_delete_own_pending_or_rejected"
on public.running_records
for delete
to authenticated
using (
  user_id = auth.uid()
  and status in ('pending', 'rejected')
);

create policy "running_records_admin_all"
on public.running_records
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- CHALLENGES

create policy "challenges_select_active_or_admin"
on public.challenges
for select
to authenticated
using (
  status in ('active', 'completed')
  or public.is_admin()
);

create policy "challenges_admin_all"
on public.challenges
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- CHALLENGE MEMBERS

create policy "challenge_members_select_own_or_admin"
on public.challenge_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

create policy "challenge_members_join_active_challenge"
on public.challenge_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_active_member()
  and exists (
    select 1
    from public.challenges c
    where c.id = challenge_id
      and c.status = 'active'
      and current_date between c.start_date and c.end_date
  )
);

create policy "challenge_members_leave_own_challenge"
on public.challenge_members
for delete
to authenticated
using (user_id = auth.uid());

create policy "challenge_members_admin_all"
on public.challenge_members
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
