-- Ensure gen_random_uuid() is available
create extension if not exists pgcrypto;

-- TABLE
create table if not exists public.meal_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  items jsonb not null,  -- array of {name, canonicalName, grams}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Shape constraint: items must be a JSON array
alter table public.meal_sets
  add constraint meal_sets_items_is_array
  check (jsonb_typeof(items) = 'array');

-- Indexes for speed
create index if not exists meal_sets_user_id_idx
  on public.meal_sets (user_id, updated_at desc);

-- Optional: query-by-items later (e.g., canonicalName searches)
create index if not exists meal_sets_items_gin_idx
  on public.meal_sets using gin (items);

-- Row Level Security
alter table public.meal_sets enable row level security;

-- Policies
drop policy if exists "Users can view their own meal sets" on public.meal_sets;
create policy "Users can view their own meal sets"
  on public.meal_sets
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own meal sets" on public.meal_sets;
create policy "Users can create their own meal sets"
  on public.meal_sets
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own meal sets" on public.meal_sets;
create policy "Users can update their own meal sets"
  on public.meal_sets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own meal sets" on public.meal_sets;
create policy "Users can delete their own meal sets"
  on public.meal_sets
  for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

drop trigger if exists update_meal_sets_updated_at on public.meal_sets;
create trigger update_meal_sets_updated_at
  before update on public.meal_sets
  for each row
  execute function public.update_updated_at_column();

-- Defense-in-depth: set user_id from auth on insert
create or replace function public.set_meal_sets_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := coalesce(new.user_id, auth.uid());
  return new;
end;
$$;

drop trigger if exists set_meal_sets_user_id on public.meal_sets;
create trigger set_meal_sets_user_id
  before insert on public.meal_sets
  for each row
  execute function public.set_meal_sets_user_id();