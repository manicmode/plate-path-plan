-- 1) Ensure profiles has the fields we need
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text;

create index if not exists idx_profiles_display_name on public.profiles (display_name);

-- 2) RLS: allow members of the same Rank-of-20 challenge to read each other's basic profile
alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where policyname = 'profiles_select_rank20_peers'
      and tablename = 'profiles'
      and schemaname = 'public'
  ) then
    create policy profiles_select_rank20_peers on public.profiles
      for select using (
        exists (
          select 1
          from public.private_challenge_participations p1
          join public.private_challenge_participations p2
            on p1.private_challenge_id = p2.private_challenge_id
          join public.private_challenges pc
            on pc.id = p1.private_challenge_id
          where pc.challenge_type = 'rank_of_20'
            and p1.user_id = public.profiles.user_id   -- profile owner
            and p2.user_id = auth.uid()                 -- current user
        )
        or public.profiles.user_id = auth.uid()         -- allow reading own profile
      );
  end if;
end$$;

-- 3) Drop existing function to change return type
drop function if exists public.my_rank20_chat_list(int, timestamptz, uuid);

-- 4) Create new function with display_name + avatar_url
create or replace function public.my_rank20_chat_list(
  _limit int default 50,
  _before_created_at timestamptz default null,
  _before_id uuid default null
)
returns table (
  id uuid,
  user_id uuid,
  body text,
  created_at timestamptz,
  display_name text,
  avatar_url text
)
language sql security definer
set search_path = public, pg_catalog
as $$
  select
    c.id, c.user_id, c.body, c.created_at,
    coalesce(p.display_name, 'User ' || substr(c.user_id::text, 1, 5)) as display_name,
    p.avatar_url
  from public.rank20_chat_messages c
  join public.private_challenges pc on pc.id = c.challenge_id
  join public.private_challenge_participations pcp on pcp.private_challenge_id = pc.id
  left join public.profiles p on p.user_id = c.user_id
  where pc.challenge_type = 'rank_of_20'
    and pcp.user_id = auth.uid()
    and (
      _before_created_at is null
      or c.created_at < _before_created_at
      or (c.created_at = _before_created_at and c.id < _before_id)
    )
  order by c.created_at desc, c.id desc
  limit coalesce(_limit, 50);
$$;

grant execute on function public.my_rank20_chat_list(int, timestamptz, uuid) to authenticated;

-- 5) Seed display names for test users
insert into public.profiles (user_id, display_name, avatar_url)
values
  ('8589c22a-00f5-4e42-a197-fe0dbd87a5d8', 'Tom', null),
  ('ea6022e7-0947-4322-ab30-bfff6774b334', 'Sally', null),
  ('f8458f5c-cd73-44ba-a818-6996d23e454b', 'Alex', null)
on conflict (user_id) do update
set display_name = excluded.display_name;