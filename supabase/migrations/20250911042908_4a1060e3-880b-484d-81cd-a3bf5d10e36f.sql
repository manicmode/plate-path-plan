-- Create nutrition_vault schema
create schema if not exists nutrition_vault;

-- Main items table
create table if not exists nutrition_vault.items (
  id uuid primary key,
  canonical_key text not null,
  upc_gtin text,
  provider text not null check (provider in ('edamam','nutritionix')),
  provider_ref text not null,
  name text not null,
  brand text,
  restaurant text,
  class_id text,
  region text default 'US',
  label_base text default 'US_2016',
  confidence numeric not null default 1.0,
  per100g jsonb not null,
  portion_defs jsonb,
  attribution text,
  ttl_days int not null default 365,
  first_seen timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  flags jsonb,
  version int not null default 1,
  constraint nv_confidence_0_1 check (confidence between 0 and 1)
);

-- Aliases to help text lookup
create table if not exists nutrition_vault.aliases (
  id uuid primary key,
  item_id uuid not null references nutrition_vault.items(id) on delete cascade,
  alias text not null,
  source text default 'provider'
);

-- Lookups for metrics/observability
create table if not exists nutrition_vault.lookups (
  id uuid primary key,
  q text not null,
  item_id uuid,
  hit boolean not null,
  provider text,
  created_at timestamptz default now()
);

-- Uniqueness & indexes
create unique index if not exists nv_unique_provider_ref on nutrition_vault.items(provider, provider_ref);
create unique index if not exists nv_unique_canonical on nutrition_vault.items(canonical_key);
create index if not exists nv_idx_upc on nutrition_vault.items(upc_gtin);
create index if not exists nv_idx_name on nutrition_vault.items(name);
create index if not exists nv_idx_brand on nutrition_vault.items(brand);
create index if not exists nv_idx_alias on nutrition_vault.aliases(alias);

-- RLS
alter table nutrition_vault.items enable row level security;
alter table nutrition_vault.aliases enable row level security;
alter table nutrition_vault.lookups enable row level security;

-- Policies
create policy nv_read on nutrition_vault.items for select using (true);
create policy nv_insert_items on nutrition_vault.items for insert with check (false);
create policy nv_read_alias on nutrition_vault.aliases for select using (true);
create policy nv_insert_alias on nutrition_vault.aliases for insert with check (false);
create policy nv_insert_lookups on nutrition_vault.lookups for insert to authenticated with check (true);