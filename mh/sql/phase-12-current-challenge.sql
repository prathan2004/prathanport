-- Phase 12 - Current Challenge and Admin Run Cleanup
-- Run this in Supabase SQL Editor after phase-03-schema.sql and phase-04-rls.sql.
-- This migration lets admins choose one current challenge.
-- Leaderboard and member summary will use the current challenge date range when one is selected.

alter table public.challenges
add column if not exists is_current_challenge boolean not null default false;

create unique index if not exists challenges_single_current_idx
on public.challenges(is_current_challenge)
where is_current_challenge = true;

drop policy if exists "running_records_insert_own_pending" on public.running_records;
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

drop policy if exists "running_records_update_own_pending_or_rejected" on public.running_records;
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

create or replace function public.get_leaderboard(range_key text default 'all')
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  avatar_url text,
  total_runs bigint,
  total_distance numeric,
  average_pace numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with current_challenge as (
    select start_date, end_date
    from public.challenges
    where is_current_challenge = true
    limit 1
  ),
  fallback_bounds as (
    select
      case
        when range_key = 'today' then current_date
        when range_key = 'week' then date_trunc('week', current_date)::date
        when range_key = 'month' then date_trunc('month', current_date)::date
        else date '1900-01-01'
      end as start_date,
      current_date as end_date
  ),
  bounds as (
    select
      coalesce(cc.start_date, fb.start_date) as start_date,
      coalesce(cc.end_date, fb.end_date) as end_date
    from fallback_bounds fb
    left join current_challenge cc on true
  ),
  totals as (
    select
      rr.user_id,
      count(*)::bigint as total_runs,
      coalesce(sum(rr.distance_km), 0)::numeric(10,2) as total_distance,
      round(avg(rr.pace), 2)::numeric(8,2) as average_pace
    from public.running_records rr
    cross join bounds b
    where rr.status = 'approved'
      and rr.run_date between b.start_date and b.end_date
    group by rr.user_id
  )
  select
    dense_rank() over (order by t.total_distance desc, t.total_runs asc) as rank,
    p.id as user_id,
    p.display_name,
    p.avatar_url,
    t.total_runs,
    t.total_distance,
    t.average_pace
  from totals t
  join public.profiles p on p.id = t.user_id
  where p.status = 'active'
  order by rank, p.display_name;
$$;

create or replace function public.get_member_dashboard_summary()
returns table (
  today_distance numeric,
  week_distance numeric,
  month_distance numeric,
  all_time_distance numeric,
  total_runs bigint,
  average_pace numeric,
  current_rank bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with approved as (
    select rr.*
    from public.running_records rr
    left join public.challenges c on c.is_current_challenge = true
    where rr.user_id = auth.uid()
      and rr.status = 'approved'
      and (
        c.id is null
        or rr.run_date between c.start_date and c.end_date
      )
  ),
  my_totals as (
    select
      coalesce(sum(distance_km) filter (where run_date = current_date), 0)::numeric(10,2) as today_distance,
      coalesce(sum(distance_km) filter (where run_date >= date_trunc('week', current_date)::date), 0)::numeric(10,2) as week_distance,
      coalesce(sum(distance_km) filter (where run_date >= date_trunc('month', current_date)::date), 0)::numeric(10,2) as month_distance,
      coalesce(sum(distance_km), 0)::numeric(10,2) as all_time_distance,
      count(*)::bigint as total_runs,
      round(avg(pace), 2)::numeric(8,2) as average_pace
    from approved
  ),
  ranked as (
    select rr.user_id, dense_rank() over (order by sum(rr.distance_km) desc) as rank
    from public.running_records rr
    left join public.challenges c on c.is_current_challenge = true
    where rr.status = 'approved'
      and (
        c.id is null
        or rr.run_date between c.start_date and c.end_date
      )
    group by rr.user_id
  )
  select
    mt.today_distance,
    mt.week_distance,
    mt.month_distance,
    mt.all_time_distance,
    mt.total_runs,
    mt.average_pace,
    r.rank as current_rank
  from my_totals mt
  left join ranked r on r.user_id = auth.uid();
$$;

create or replace function public.get_current_challenge_summary()
returns table (
  id uuid,
  challenge_name text,
  description text,
  start_date date,
  end_date date,
  target_distance numeric,
  status text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.challenge_name,
    c.description,
    c.start_date,
    c.end_date,
    c.target_distance,
    c.status
  from public.challenges c
  where c.is_current_challenge = true
  limit 1;
$$;

create or replace function public.get_public_leaderboard()
returns table (
  rank bigint,
  display_name text,
  total_runs bigint,
  total_distance numeric,
  average_pace numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with current_challenge as (
    select start_date, end_date
    from public.challenges
    where is_current_challenge = true
    limit 1
  ),
  totals as (
    select
      rr.user_id,
      count(*)::bigint as total_runs,
      coalesce(sum(rr.distance_km), 0)::numeric(10,2) as total_distance,
      round(avg(rr.pace), 2)::numeric(8,2) as average_pace
    from public.running_records rr
    cross join current_challenge c
    where rr.status = 'approved'
      and rr.run_date between c.start_date and c.end_date
    group by rr.user_id
  )
  select
    dense_rank() over (order by t.total_distance desc, t.total_runs asc) as rank,
    p.display_name,
    t.total_runs,
    t.total_distance,
    t.average_pace
  from totals t
  join public.profiles p on p.id = t.user_id
  where p.status = 'active'
  order by rank, p.display_name
  limit 10;
$$;

revoke execute on function public.get_leaderboard(text) from public;
revoke execute on function public.get_member_dashboard_summary() from public;
revoke execute on function public.get_current_challenge_summary() from public;
revoke execute on function public.get_public_leaderboard() from public;

grant execute on function public.get_leaderboard(text) to authenticated;
grant execute on function public.get_member_dashboard_summary() to authenticated;
grant execute on function public.get_current_challenge_summary() to anon;
grant execute on function public.get_current_challenge_summary() to authenticated;
grant execute on function public.get_public_leaderboard() to anon;
grant execute on function public.get_public_leaderboard() to authenticated;
