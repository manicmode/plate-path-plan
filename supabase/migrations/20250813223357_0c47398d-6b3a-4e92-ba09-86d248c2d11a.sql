-- Update _ensure_rank20_challenge function to use simplified title
create or replace function public._ensure_rank20_challenge(_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  challenge_rec record;
begin
  -- Check if a challenge already exists for this group
  select pc.* into challenge_rec
  from public.private_challenges pc
  join public.rank20_groups g on g.challenge_id = pc.id
  where g.id = _group_id;

  if found then
    return challenge_rec.id;
  end if;

  -- Create new challenge with simplified title (no batch number)
  insert into public.private_challenges (
    title,
    description,
    creator_id,
    category,
    challenge_type,
    duration_days,
    start_date,
    max_participants,
    status,
    badge_icon
  ) values (
    'Rank of 20',  -- Simplified title without batch number
    'A monthly fitness challenge bringing together 20 like-minded individuals to push their limits and achieve greatness together.',
    '00000000-0000-0000-0000-000000000000', -- system user
    'fitness',
    'rank_of_20',
    30,
    current_date,
    20,
    'active',
    '🏆'
  ) returning * into challenge_rec;

  -- Link the challenge to the group
  update public.rank20_groups 
  set challenge_id = challenge_rec.id 
  where id = _group_id;

  return challenge_rec.id;
end
$$;

-- Update all existing Rank-of-20 challenge titles to remove batch numbers
update public.private_challenges
set title = 'Rank of 20'
where title like 'Rank of 20 — Batch %';