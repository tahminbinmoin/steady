-- =============================================================================
-- Habit & Goal Tracker — initial schema
-- 0001_init.sql
--
-- Design rules enforced here (not only in the app), because a signed-in user's
-- token can call the Supabase Data API directly:
--   1. A habit entry can only be written for TODAY in the user's stored timezone.
--      "Today" is computed by the database clock; the client never sends a date.
--   2. Entries are written only through public.set_today_completion(); the
--      authenticated role has no INSERT/UPDATE/DELETE privilege on habit_entries.
--   3. Timezone changes go through public.apply_timezone(), callable only by the
--      server (service_role). Changes after the first are limited to one per 24h,
--      and a monotonic "date floor" stops a timezone switch from reopening a day
--      that has already ended.
--   4. RLS: every row is visible and editable only by its owner.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- True when tz is a name in Postgres's IANA timezone database.
create or replace function public.is_valid_timezone(tz text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select tz is not null
     and exists (select 1 from pg_catalog.pg_timezone_names where name = tz);
$$;

-- The calendar date at instant ts in timezone tz. DST is handled by tzdata.
create or replace function public.local_date_at(ts timestamptz, tz text)
returns date
language sql
stable
set search_path = ''
as $$
  select (ts at time zone tz)::date;
$$;

-- Generic updated_at maintenance.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  full_name           text check (char_length(full_name) <= 120),
  email               text check (char_length(email) <= 320),
  avatar_url          text check (char_length(avatar_url) <= 2048),
  timezone            text not null default 'UTC',
  timezone_source     text not null default 'default'
                        check (timezone_source in ('default', 'ip', 'browser')),
  timezone_updated_at timestamptz,
  -- Earliest calendar date that may still be tracked. Raised (never lowered)
  -- whenever the timezone changes, so switching west cannot reopen a past day.
  date_floor          date,
  theme_preference    text not null default 'system'
                        check (theme_preference in ('light', 'dark', 'system')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Audit trail of timezone changes (also used for rate limiting).
create table public.timezone_changes (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  old_tz      text not null,
  new_tz      text not null,
  source      text not null check (source in ('ip', 'browser')),
  changed_at  timestamptz not null default now()
);
create index timezone_changes_user_idx on public.timezone_changes (user_id, changed_at desc);

-- Create a profile row whenever Supabase Auth creates a user (Google / Apple).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Today's date for a user, in their stored timezone, from the database clock.
create or replace function public.user_local_date(p_user_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select public.local_date_at(now(), p.timezone)
  from public.profiles p
  where p.id = p_user_id;
$$;

-- What the app shows as "today". Callable by the signed-in user only.
create or replace function public.get_today()
returns table (today date, timezone text, date_floor date)
language sql
stable
security definer
set search_path = ''
as $$
  select public.local_date_at(now(), p.timezone), p.timezone, p.date_floor
  from public.profiles p
  where p.id = auth.uid();
$$;

-- Set or change a user's timezone. Server-only (service_role): the Next.js
-- route handler calls it with the timezone from Vercel's IP header, or the
-- browser timezone when that header is absent (local development).
create or replace function public.apply_timezone(
  p_user_id uuid,
  p_timezone text,
  p_source text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile   public.profiles;
  v_old_tz    text;
  v_old_today date;
begin
  if not public.is_valid_timezone(p_timezone) then
    raise exception 'Unknown timezone: %', p_timezone using errcode = '22023';
  end if;
  if p_source not in ('ip', 'browser') then
    raise exception 'Invalid timezone source: %', p_source using errcode = '22023';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if v_profile.timezone = p_timezone then
    return v_profile; -- nothing to do
  end if;

  -- First real timezone is free; later changes: at most one per 24 hours.
  if v_profile.timezone_source <> 'default'
     and v_profile.timezone_updated_at > now() - interval '24 hours' then
    raise exception 'Timezone was changed less than 24 hours ago'
      using errcode = 'P0001', hint = 'TZ_RATE_LIMITED';
  end if;

  v_old_tz    := v_profile.timezone;
  v_old_today := public.local_date_at(now(), v_old_tz);

  update public.profiles
     set timezone            = p_timezone,
         timezone_source     = p_source,
         timezone_updated_at = now(),
         date_floor          = greatest(coalesce(date_floor, v_old_today), v_old_today)
   where id = p_user_id
  returning * into v_profile;

  insert into public.timezone_changes (user_id, old_tz, new_tz, source)
  values (p_user_id, v_old_tz, p_timezone, p_source);

  return v_profile;
end;
$$;

-- ---------------------------------------------------------------------------
-- objectives
-- ---------------------------------------------------------------------------
create table public.objectives (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid()
                 references public.profiles (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 120),
  description  text check (char_length(description) <= 1000),
  category     text check (char_length(category) <= 40),
  icon         text check (char_length(icon) <= 32),
  month        smallint not null check (month between 1 and 12),
  year         smallint not null check (year between 2000 and 2100),
  status       text not null default 'active' check (status in ('active', 'archived')),
  -- First trackable day: the 1st of the month, or the creation day if the
  -- objective is created mid-month. Set by trigger; analytics start here.
  start_date   date not null,
  -- Local date the objective was archived (null while active).
  archived_on  date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- Lets habit_entries reference (id, user_id) so an entry can never point at
  -- another user's objective.
  constraint objectives_id_user_key unique (id, user_id),
  constraint objectives_start_in_month check (
    extract(year from start_date) = year and extract(month from start_date) = month
  )
);
create index objectives_user_period_idx on public.objectives (user_id, year, month);

create or replace function public.objectives_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date;
  v_month_start date;
begin
  if tg_op = 'INSERT' then
    v_today := public.user_local_date(new.user_id);
    if v_today is null then
      raise exception 'Profile not found for user' using errcode = 'P0002';
    end if;
    v_month_start := make_date(new.year, new.month, 1);
    if v_month_start < date_trunc('month', v_today)::date then
      raise exception 'Objectives cannot be created for a past month'
        using errcode = 'P0001', hint = 'PAST_MONTH';
    end if;
    new.start_date  := greatest(v_month_start, v_today);
    new.status      := coalesce(new.status, 'active');
    new.archived_on := case when new.status = 'archived' then v_today end;
    return new;
  end if;

  -- UPDATE: period and ownership are fixed; use "carry forward" to copy.
  if new.user_id    is distinct from old.user_id
     or new.month      is distinct from old.month
     or new.year       is distinct from old.year
     or new.start_date is distinct from old.start_date
     or new.created_at is distinct from old.created_at then
    raise exception 'Owner, month, year and start date of an objective cannot change'
      using errcode = 'P0001', hint = 'IMMUTABLE_FIELD';
  end if;

  if new.status = 'archived' and old.status = 'active' then
    new.archived_on := public.user_local_date(new.user_id);
  elsif new.status = 'active' then
    new.archived_on := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger objectives_guard
  before insert or update on public.objectives
  for each row execute function public.objectives_guard();

-- ---------------------------------------------------------------------------
-- habit_entries
-- ---------------------------------------------------------------------------
create table public.habit_entries (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null,
  objective_id     uuid not null,
  completion_date  date not null,
  completed        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint habit_entries_objective_fk
    foreign key (objective_id, user_id)
    references public.objectives (id, user_id) on delete cascade,
  constraint habit_entries_one_per_day unique (user_id, objective_id, completion_date)
);
create index habit_entries_user_date_idx on public.habit_entries (user_id, completion_date);
create index habit_entries_objective_idx on public.habit_entries (objective_id);

-- Defence in depth: even writes that do not go through set_today_completion()
-- (e.g. a future bug, or misuse of the secret key) must satisfy the today rule.
create or replace function public.habit_entries_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today   date;
  v_floor   date;
  v_obj     public.objectives;
begin
  -- Seed/test escape hatch: only for a direct database session (no SET ROLE,
  -- which every Data API request performs), with no API user, that explicitly
  -- opts in. Unreachable through the API, including with the secret key.
  if current_setting('role') = 'none'
     and auth.uid() is null
     and coalesce(current_setting('app.allow_backfill', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id
       or new.objective_id is distinct from old.objective_id
       or new.completion_date is distinct from old.completion_date
       or new.created_at is distinct from old.created_at then
      raise exception 'Only the completed flag of an entry can change'
        using errcode = 'P0001', hint = 'IMMUTABLE_FIELD';
    end if;
    new.updated_at := now();
  end if;

  select public.local_date_at(now(), p.timezone), p.date_floor
    into v_today, v_floor
  from public.profiles p
  where p.id = new.user_id;

  if v_today is null then
    raise exception 'Profile not found for user' using errcode = 'P0002';
  end if;

  if new.completion_date <> v_today then
    raise exception 'Entries can only be recorded for today (%)', v_today
      using errcode = 'P0001', hint = 'NOT_TODAY';
  end if;

  if v_floor is not null and new.completion_date < v_floor then
    raise exception 'This day has already ended in your previous timezone'
      using errcode = 'P0001', hint = 'BEFORE_DATE_FLOOR';
  end if;

  select * into v_obj from public.objectives
  where id = new.objective_id and user_id = new.user_id;

  if not found then
    raise exception 'Objective not found' using errcode = 'P0002';
  end if;
  if v_obj.status <> 'active' then
    raise exception 'Archived objectives cannot be tracked'
      using errcode = 'P0001', hint = 'ARCHIVED';
  end if;
  if new.completion_date < v_obj.start_date
     or new.completion_date >= (make_date(v_obj.year, v_obj.month, 1) + interval '1 month')::date then
    raise exception 'Objective is not trackable on %', new.completion_date
      using errcode = 'P0001', hint = 'OUTSIDE_OBJECTIVE_MONTH';
  end if;

  return new;
end;
$$;

create trigger habit_entries_guard
  before insert or update on public.habit_entries
  for each row execute function public.habit_entries_guard();

-- The ONLY write path for users. Sets today's completion for one objective.
-- Idempotent: the client sends the desired state, so a double click is harmless.
create or replace function public.set_today_completion(
  p_objective_id uuid,
  p_completed boolean
)
returns table (objective_id uuid, completion_date date, completed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_today date;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;
  if p_completed is null then
    raise exception 'completed must be true or false' using errcode = '22023';
  end if;

  v_today := public.user_local_date(v_uid);

  return query
  insert into public.habit_entries as e (user_id, objective_id, completion_date, completed)
  values (v_uid, p_objective_id, v_today, p_completed)
  on conflict on constraint habit_entries_one_per_day
  do update set completed = excluded.completed
  returning e.objective_id, e.completion_date, e.completed;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.objectives       enable row level security;
alter table public.habit_entries    enable row level security;
alter table public.timezone_changes enable row level security;

create policy "profiles: owner can read"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: owner can update"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "objectives: owner can read"
  on public.objectives for select to authenticated
  using (user_id = (select auth.uid()));

create policy "objectives: owner can insert"
  on public.objectives for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "objectives: owner can update"
  on public.objectives for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "objectives: owner can delete"
  on public.objectives for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "habit_entries: owner can read"
  on public.habit_entries for select to authenticated
  using (user_id = (select auth.uid()));
-- No insert/update/delete policies: writes go through set_today_completion().

create policy "timezone_changes: owner can read"
  on public.timezone_changes for select to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Privileges (Supabase grants broad defaults; narrow them explicitly)
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

revoke all on public.profiles, public.objectives, public.habit_entries,
              public.timezone_changes from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, theme_preference) on public.profiles to authenticated;

grant select, delete on public.objectives to authenticated;
grant insert (title, description, category, icon, month, year, status)
  on public.objectives to authenticated;
grant update (title, description, category, icon, status)
  on public.objectives to authenticated;

grant select on public.habit_entries to authenticated;
grant select on public.timezone_changes to authenticated;

-- Functions: Postgres grants EXECUTE to PUBLIC by default.
revoke execute on function public.apply_timezone(uuid, text, text) from public, anon, authenticated;
grant  execute on function public.apply_timezone(uuid, text, text) to service_role;

revoke execute on function public.set_today_completion(uuid, boolean) from public, anon;
grant  execute on function public.set_today_completion(uuid, boolean) to authenticated;

revoke execute on function public.get_today() from public, anon;
grant  execute on function public.get_today() to authenticated;

revoke execute on function public.user_local_date(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.objectives_guard() from public, anon, authenticated;
revoke execute on function public.habit_entries_guard() from public, anon, authenticated;
