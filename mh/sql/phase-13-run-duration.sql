-- Run once in the Supabase SQL Editor before deploying the new time input.
-- Existing durations stay in minutes: 45 remains 45 minutes, not 45 seconds.
begin;

-- The generated pace column must be rebuilt before its source type can change.
alter table public.running_records drop column pace;
alter table public.running_records
  alter column duration_minutes type numeric(12,6)
  using duration_minutes::numeric(12,6);
alter table public.running_records
  add column pace numeric(8,2)
  generated always as (round(duration_minutes / nullif(distance_km, 0), 2)) stored;

commit;
notify pgrst, 'reload schema';
