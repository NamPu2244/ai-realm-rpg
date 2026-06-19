-- AI Realm: Phase 6 schema (accounts + cloud save slots)
-- Run this in the Supabase SQL editor for your project.

-- 1. Profiles -----------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Save slots -----------------------------------------------------------
create table if not exists public.save_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  world_name text not null,
  world_config jsonb not null,
  player_status jsonb not null,
  game_state jsonb not null default '{}'::jsonb,
  history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists save_slots_user_id_idx on public.save_slots (user_id);

alter table public.save_slots enable row level security;

create policy "Users can view own save slots"
  on public.save_slots for select
  using (auth.uid() = user_id);

create policy "Users can insert own save slots"
  on public.save_slots for insert
  with check (auth.uid() = user_id);

create policy "Users can update own save slots"
  on public.save_slots for update
  using (auth.uid() = user_id);

create policy "Users can delete own save slots"
  on public.save_slots for delete
  using (auth.uid() = user_id);

-- Keep updated_at fresh on every change.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists save_slots_set_updated_at on public.save_slots;
create trigger save_slots_set_updated_at
  before update on public.save_slots
  for each row execute procedure public.set_updated_at();

-- 3. Rate limiting (turn quotas per IP per day) ----------------------------
create table if not exists public.turn_limits (
  ip_hash text not null,
  date_utc text not null,
  count int not null default 0,
  primary key (ip_hash, date_utc)
);

-- Atomically increment and return new count
create or replace function public.increment_turn_count(p_ip_hash text, p_date_utc text)
returns int
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  insert into public.turn_limits (ip_hash, date_utc, count)
  values (p_ip_hash, p_date_utc, 1)
  on conflict (ip_hash, date_utc)
  do update set count = turn_limits.count + 1
  returning count into v_count;
  return v_count;
end;
$$;

-- 4. Feedback ---------------------------------------------------------------
create table if not exists public.feedback (
  id bigserial primary key,
  message text not null,
  save_slot_id text,
  created_at timestamptz not null default now()
);
