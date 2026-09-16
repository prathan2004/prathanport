-- Phase 3 - Supabase schema for MH Running App
-- Run this in Supabase SQL Editor before phase-04-rls.sql.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  display_name text not null,
  email text not null,
  avatar_url text,
  gender text,
  birth_year integer,
  role text not null default 'member',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_not_blank check (length(trim(display_name)) > 0),
  constraint profiles_role_check check (role in ('member', 'admin')),
  constraint profiles_status_check check (status in ('active', 'inactive')),
  constraint profiles_birth_year_check check (
    birth_year is null
    or (birth_year between 1900 and extract(year from current_date)::integer)
  )
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    if new.role <> old.role or new.status <> old.status then
      raise exception 'Members cannot change their own role or status';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_profile_privilege_escalation
before update on public.profiles
for each row execute function public.prevent_profile_privilege_escalation();

create table if not exists public.running_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_date date not null,
  distance_km numeric(8,2) not null,
  duration_minutes integer not null,
  pace numeric(8,2) generated always as (round(duration_minutes::numeric / nullif(distance_km, 0), 2)) stored,
  note text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint running_records_distance_check check (distance_km > 0),
  constraint running_records_duration_check check (duration_minutes > 0),
  constraint running_records_run_date_check check (run_date <= current_date),
  constraint running_records_status_check check (status in ('pending', 'approved', 'rejected'))
);

create trigger running_records_set_updated_at
before update on public.running_records
for each row execute function public.set_updated_at();

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  challenge_name text not null,
  description text,
  start_date date not null,
  end_date date not null,
  target_distance numeric(8,2) not null,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint challenges_name_not_blank check (length(trim(challenge_name)) > 0),
  constraint challenges_date_check check (end_date >= start_date),
  constraint challenges_target_distance_check check (target_distance > 0),
  constraint challenges_status_check check (status in ('draft', 'active', 'completed', 'cancelled'))
);

create trigger challenges_set_updated_at
before update on public.challenges
for each row execute function public.set_updated_at();

create table if not exists public.challenge_members (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  constraint challenge_members_unique unique (challenge_id, user_id)
);

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_display_name_idx on public.profiles(display_name);

create index if not exists running_records_user_id_idx on public.running_records(user_id);
create index if not exists running_records_run_date_idx on public.running_records(run_date);
create index if not exists running_records_status_idx on public.running_records(status);
create index if not exists running_records_status_run_date_idx on public.running_records(status, run_date);
create index if not exists running_records_user_id_run_date_idx on public.running_records(user_id, run_date);

create index if not exists challenges_status_idx on public.challenges(status);
create index if not exists challenges_date_range_idx on public.challenges(start_date, end_date);

create index if not exists challenge_members_challenge_id_idx on public.challenge_members(challenge_id);
create index if not exists challenge_members_user_id_idx on public.challenge_members(user_id);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, display_name, email, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1)),
    new.email,
    'member',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

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
  with bounds as (
    select
      case
        when range_key = 'today' then current_date
        when range_key = 'week' then date_trunc('week', current_date)::date
        when range_key = 'month' then date_trunc('month', current_date)::date
        else date '1900-01-01'
      end as start_date,
      current_date as end_date
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
    select *
    from public.running_records
    where user_id = auth.uid()
      and status = 'approved'
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
    select user_id, dense_rank() over (order by sum(distance_km) desc) as rank
    from public.running_records
    where status = 'approved'
    group by user_id
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

create or replace function public.get_challenge_progress(challenge_id_input uuid)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  total_distance numeric,
  target_distance numeric,
  progress_percent numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    p.display_name,
    p.avatar_url,
    coalesce(sum(rr.distance_km), 0)::numeric(10,2) as total_distance,
    c.target_distance,
    least(round((coalesce(sum(rr.distance_km), 0) / c.target_distance) * 100, 2), 100)::numeric(6,2) as progress_percent
  from public.challenges c
  join public.challenge_members cm on cm.challenge_id = c.id
  join public.profiles p on p.id = cm.user_id
  left join public.running_records rr
    on rr.user_id = cm.user_id
    and rr.status = 'approved'
    and rr.run_date between c.start_date and c.end_date
  where c.id = challenge_id_input
  group by p.id, p.display_name, p.avatar_url, c.target_distance
  order by total_distance desc, p.display_name;
$$;

revoke execute on function public.is_admin() from public;
revoke execute on function public.is_active_member() from public;
revoke execute on function public.get_leaderboard(text) from public;
revoke execute on function public.get_member_dashboard_summary() from public;
revoke execute on function public.get_challenge_progress(uuid) from public;

grant execute on function public.get_leaderboard(text) to authenticated;
grant execute on function public.get_member_dashboard_summary() to authenticated;
grant execute on function public.get_challenge_progress(uuid) to authenticated;
