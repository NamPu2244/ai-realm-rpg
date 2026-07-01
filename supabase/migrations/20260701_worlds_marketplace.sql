-- World Store / Marketplace: publishable, playable worlds.
--
-- Each row is a shareable world. `world_config` carries the same shape the game
-- engine consumes (see WorldConfig in src/store/useGameStore.ts), so a listing
-- can be loaded straight into a fresh game. Public SELECT; only the creator may
-- write their own rows.
--
-- This migration is idempotent — safe to re-run. If an earlier version of the
-- `worlds` table already exists (without world_config), the ALTER below adds the
-- missing column.

create table if not exists public.worlds (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.profiles (id) on delete set null,
  title text not null,
  synopsis text not null default '',
  cover_url text,
  cover_type text not null default 'auto',      -- 'auto' | 'upload'
  trope_tags text[] not null default '{}',
  world_config jsonb,                           -- WorldConfig the game loads to play
  is_premium boolean not null default false,
  price_coins integer not null default 0,
  rating numeric(2,1) not null default 0,
  player_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Backfill the column onto pre-existing installs of the table.
alter table public.worlds add column if not exists world_config jsonb;

create index if not exists worlds_player_count_idx on public.worlds (player_count desc);
create index if not exists worlds_created_at_idx on public.worlds (created_at desc);
create index if not exists worlds_trope_tags_idx on public.worlds using gin (trope_tags);

alter table public.worlds enable row level security;

-- Policies (dropped first so this migration can be re-run without error).
drop policy if exists "Anyone can view worlds" on public.worlds;
create policy "Anyone can view worlds"
  on public.worlds for select
  using (true);

drop policy if exists "Creators can insert own worlds" on public.worlds;
create policy "Creators can insert own worlds"
  on public.worlds for insert
  with check (auth.uid() = creator_id);

drop policy if exists "Creators can update own worlds" on public.worlds;
create policy "Creators can update own worlds"
  on public.worlds for update
  using (auth.uid() = creator_id);

drop policy if exists "Creators can delete own worlds" on public.worlds;
create policy "Creators can delete own worlds"
  on public.worlds for delete
  using (auth.uid() = creator_id);

-- Atomic play-counter bump (avoids a read-modify-write race). Called from the
-- API route when a player launches a world from the store.
create or replace function public.increment_world_players(world_id uuid)
returns void as $$
  update public.worlds set player_count = player_count + 1 where id = world_id;
$$ language sql security definer set search_path = public;
