-- 1) Table for private challenge messages
create table if not exists public.private_challenge_messages (
  id uuid primary key default gen_random_uuid(),
  private_challenge_id uuid not null
    references public.private_challenges(id) on delete cascade,
  user_id uuid not null
    references public.user_profiles(user_id) on delete cascade,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

-- 2) Useful indexes
create index if not exists idx_priv_msgs_chal_time
  on public.private_challenge_messages (private_challenge_id, created_at);
create index if not exists idx_priv_msgs_user_time
  on public.private_challenge_messages (user_id, created_at);

-- 3) RLS
alter table public.private_challenge_messages enable row level security;

-- allow creator or any participant to read
create policy "select private messages if creator or participant"
on public.private_challenge_messages
for select to authenticated
using (
  exists (
    select 1
    from public.private_challenges pc
    left join public.private_challenge_participations p
      on p.private_challenge_id = pc.id and p.user_id = auth.uid()
    where pc.id = private_challenge_messages.private_challenge_id
      and (pc.creator_id = auth.uid() or p.user_id is not null)
  )
);

-- allow creator or any participant to insert
create policy "insert private messages if creator or participant"
on public.private_challenge_messages
for insert to authenticated
with check (
  exists (
    select 1
    from public.private_challenges pc
    left join public.private_challenge_participations p
      on p.private_challenge_id = pc.id and p.user_id = auth.uid()
    where pc.id = private_challenge_messages.private_challenge_id
      and (pc.creator_id = auth.uid() or p.user_id is not null)
  )
);