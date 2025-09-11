-- Enable required extensions
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

-- Create nutrition_vault schema
create schema if not exists nutrition_vault;

-- Main items table
create table if not exists nutrition_vault.items (
  id uuid primary key default gen_random_uuid(),
  canonical_key text not null,                              -- normalized(name|brand|class_id|region)
  upc_gtin text,                                           -- 8–14 digit string if present
  provider text not null check (provider in ('edamam','nutritionix')),
  provider_ref text not null,                              -- vendor id / nix_item_id / edamam foodId
  name text not null,
  brand text,
  restaurant text,
  class_id text,                                           -- e.g., 'california_roll', 'chicken_breast'
  region text default 'US',
  label_base text default 'US_2016',
  confidence numeric not null default 1.0,
  per100g jsonb not null,                                  -- {kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, ...}
  portion_defs jsonb,                                      -- optional, derived & license-safe
  attribution text,                                        -- "Source: Edamam" / "Source: Nutritionix"
  ttl_days int not null default 365,
  first_seen timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,                        -- computed by trigger
  flags jsonb,                                             -- {restaurant:true, generic:false, ...}
  version int not null default 1,
  
  -- Safety constraints
  constraint nv_confidence_0_1 check (confidence between 0 and 1)
);

-- Aliases to help text lookup
create table if not exists nutrition_vault.aliases (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references nutrition_vault.items(id) on delete cascade,
  alias text not null,
  source text default 'provider' -- provider|user|system
);

-- Lookups for metrics/observability
create table if not exists nutrition_vault.lookups (
  id uuid primary key default gen_random_uuid(),
  q text not null,
  item_id uuid,
  hit boolean not null,
  provider text,                  -- hit provider when served from cache (edamam|nutritionix|cache)
  created_at timestamptz default now()
);

-- Uniqueness & indexes
create unique index if not exists nv_unique_provider_ref on nutrition_vault.items(provider, provider_ref);
create unique index if not exists nv_unique_canonical on nutrition_vault.items(canonical_key);
create index if not exists nv_idx_upc on nutrition_vault.items(upc_gtin);
create index if not exists nv_idx_name on nutrition_vault.items using gin (name gin_trgm_ops);
create index if not exists nv_idx_brand on nutrition_vault.items using gin (brand gin_trgm_ops);
create index if not exists nv_idx_alias on nutrition_vault.aliases using gin (alias gin_trgm_ops);

-- Auto-update updated_at and expires_at trigger
create or replace function nutrition_vault_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.expires_at := new.updated_at + make_interval(days => new.ttl_days);
  return new;
end$$;

create trigger nv_items_set_updated_at
before insert or update on nutrition_vault.items
for each row execute function nutrition_vault_set_updated_at();

-- RLS: readable via edge function; writes only with service key
alter table nutrition_vault.items enable row level security;
alter table nutrition_vault.aliases enable row level security;
alter table nutrition_vault.lookups enable row level security;

-- Items policies (service role only for writes)
create policy nv_read on nutrition_vault.items for select using (true);
create policy nv_insert_items on nutrition_vault.items for insert with check (false);

-- Aliases policies (service role only for writes)
create policy nv_read_alias on nutrition_vault.aliases for select using (true);
create policy nv_insert_alias on nutrition_vault.aliases for insert with check (false);

-- Lookups policies (authenticated users can insert telemetry)
create policy nv_insert_lookups
  on nutrition_vault.lookups for insert
  to authenticated
  with check (true);