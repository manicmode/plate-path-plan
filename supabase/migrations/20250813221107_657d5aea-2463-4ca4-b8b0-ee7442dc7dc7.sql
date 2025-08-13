-- Fix the _ensure_rank20_challenge function to include start_date
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
  insert into public.private_challenges (
    title, 
    description, 
    creator_id, 
    category,
    challenge_type, 
    target_metric, 
    target_value, 
    duration_days, 
    start_date,
    max_participants, 
    status
  )
  values (
    format('Rank of 20 — Batch %s', bn), 
    'Compete with 19 other users in this monthly ranking challenge. Track your progress on the Billboard!',
    creator, 
    'competition',
    'custom', 
    'completion', 
    100, 
    30, 
    CURRENT_DATE,
    20, 
    'active'
  )
  returning id into ch_id;

  update public.rank20_groups set challenge_id = ch_id where id = _group_id;
  return ch_id;
end$$;