-- Food text lookup cache table with normalization and TTL
-- ensure uuid generation available
create extension if not exists pgcrypto;

-- 1) Table
create table if not exists public.food_text_cache (
  id uuid primary key default gen_random_uuid(),
  q text not null,                       -- original query for debugging
  normalized_q text not null,            -- lowercase + squashed spaces
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

-- 2) Indexes / constraint
create unique index if not exists uq_food_text_cache_normalized_q
  on public.food_text_cache (normalized_q);

create index if not exists idx_food_text_cache_expires_at
  on public.food_text_cache (expires_at);

-- 3) RLS: keep table private (no public read/write)
alter table public.food_text_cache enable row level security;

-- No policies needed: Edge Functions with service role bypass RLS by design.