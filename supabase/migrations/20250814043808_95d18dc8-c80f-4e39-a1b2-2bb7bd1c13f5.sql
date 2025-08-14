-- Create table (as you wrote)
create table if not exists public.rank20_chat_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.rank20_chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 8),
  created_at timestamptz not null default now(),
  unique (message_id, user_id, emoji)
);

alter table public.rank20_chat_reactions enable row level security;

-- Select: members of the same Rank-of-20 group can see reactions
drop policy if exists r20_react_select on public.rank20_chat_reactions;
create policy r20_react_select on public.rank20_chat_reactions
for select using (
  exists (
    select 1
    from public.rank20_chat_messages c
    join public.private_challenges pc on pc.id = c.challenge_id
    join public.private_challenge_participations p
      on p.private_challenge_id = pc.id
    where c.id = rank20_chat_reactions.message_id
      and pc.challenge_type = 'rank_of_20'
      and p.user_id = auth.uid()
  )
);

-- Insert: only members can react, and only as themselves
drop policy if exists r20_react_insert on public.rank20_chat_reactions;
create policy r20_react_insert on public.rank20_chat_reactions
for insert with check (
  user_id = auth.uid() and
  exists (
    select 1
    from public.rank20_chat_messages c
    join public.private_challenges pc on pc.id = c.challenge_id
    join public.private_challenge_participations p
      on p.private_challenge_id = pc.id
    where c.id = rank20_chat_reactions.message_id
      and pc.challenge_type = 'rank_of_20'
      and p.user_id = auth.uid()
  )
);

-- Delete: users can remove their own reactions, only if members
drop policy if exists r20_react_delete on public.rank20_chat_reactions;
create policy r20_react_delete on public.rank20_chat_reactions
for delete using (
  user_id = auth.uid() and
  exists (
    select 1
    from public.rank20_chat_messages c
    join public.private_challenges pc on pc.id = c.challenge_id
    join public.private_challenge_participations p
      on p.private_challenge_id = pc.id
    where c.id = rank20_chat_reactions.message_id
      and pc.challenge_type = 'rank_of_20'
      and p.user_id = auth.uid()
  )
);

-- Toggle function (unchanged)
create or replace function public.my_rank20_react_toggle(_message_id uuid, _emoji text)
returns void language plpgsql security definer as $$
begin
  if exists (select 1 from public.rank20_chat_reactions
             where message_id=_message_id and user_id=auth.uid() and emoji=_emoji) then
    delete from public.rank20_chat_reactions
     where message_id=_message_id and user_id=auth.uid() and emoji=_emoji;
  else
    insert into public.rank20_chat_reactions (message_id, user_id, emoji)
    values (_message_id, auth.uid(), _emoji);
  end if;
end$$;
grant execute on function public.my_rank20_react_toggle(uuid, text) to authenticated;

-- Aggregate counts (unchanged)
create or replace function public.my_rank20_reactions_for(_message_ids uuid[])
returns table (message_id uuid, emoji text, count bigint)
language sql security definer as $$
  select r.message_id, r.emoji, count(*)::bigint
  from public.rank20_chat_reactions r
  where r.message_id = any(_message_ids)
  group by r.message_id, r.emoji;
$$;
grant execute on function public.my_rank20_reactions_for(uuid[]) to authenticated;

-- Idempotent realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='rank20_chat_reactions'
  ) then
    alter publication supabase_realtime add table public.rank20_chat_reactions;
  end if;
end$$;

-- Optional: index to speed up counts by message_id
create index if not exists idx_r20_react_message on public.rank20_chat_reactions (message_id);