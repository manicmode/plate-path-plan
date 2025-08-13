-- Create Rank-of-20 tables and functions (idempotent)
create table if not exists public.rank20_groups (
  id uuid primary key default gen_random_uuid(),
  batch_number bigint generated always as identity,
  challenge_id uuid unique,
  created_at timestamptz not null default now(),
  is_closed boolean not null default false
);

create table if not exists public.rank20_members (
  group_id uuid not null references public.rank20_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.rank20_groups enable row level security;
alter table public.rank20_members enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename='rank20_groups' and policyname='r20_groups_select_member') then
    create policy "r20_groups_select_member" on public.rank20_groups
      for select using (exists (
        select 1 from public.rank20_members m
        where m.group_id = rank20_groups.id and m.user_id = auth.uid()
      ));
  end if;

  if not exists (select 1 from pg_policies where tablename='rank20_members' and policyname='r20_members_select_member') then
    create policy "r20_members_select_member" on public.rank20_members
      for select using (user_id = auth.uid() or exists (
        select 1 from public.rank20_members m2
        where m2.group_id = rank20_members.group_id and m2.user_id = auth.uid()
      ));
  end if;

  if not exists (select 1 from pg_policies where tablename='rank20_members' and policyname='r20_members_insert_self') then
    create policy "r20_members_insert_self" on public.rank20_members
      for insert with check (user_id = auth.uid());
  end if;
end$$;

create or replace function public._ensure_rank20_challenge(_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  ch_id uuid;
  bn bigint;
  creator uuid;
begin
  select challenge_id, batch_number into ch_id, bn from public.rank20_groups where id = _group_id;
  if ch_id is not null then return ch_id; end if;

  creator := coalesce(auth.uid(), (select id from auth.users limit 1));
  insert into public.private_challenges (name, is_private, creator_id)
  values (format('Rank of 20 — Batch %s', bn), true, creator)
  returning id into ch_id;

  update public.rank20_groups set challenge_id = ch_id where id = _group_id;
  return ch_id;
end$$;

create or replace function public.assign_rank20(_user_id uuid)
returns table(group_id uuid, challenge_id uuid, batch_number bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  g record;
  members_count int;
begin
  select g.* into g
  from public.rank20_groups g
  where not g.is_closed
  order by g.batch_number asc
  limit 1
  for update skip locked;

  if not found then
    insert into public.rank20_groups default values returning * into g;
  end if;

  g.challenge_id := public._ensure_rank20_challenge(g.id);

  insert into public.rank20_members (group_id, user_id)
  values (g.id, _user_id)
  on conflict do nothing;

  insert into public.private_challenge_participations (private_challenge_id, user_id)
  values (g.challenge_id, _user_id)
  on conflict do nothing;

  select count(*) into members_count from public.rank20_members where group_id = g.id;
  if members_count >= 20 then
    update public.rank20_groups set is_closed = true where id = g.id;
  end if;

  return query select g.id, g.challenge_id, g.batch_number;
end
$$;

grant execute on function public.assign_rank20(uuid) to authenticated, anon;
grant execute on function public._ensure_rank20_challenge(uuid) to authenticated, anon;