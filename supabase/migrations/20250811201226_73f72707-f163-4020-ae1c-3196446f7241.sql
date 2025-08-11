-- Drop and recreate the challenges_with_counts view to include computed end_at
drop view if exists public.challenges_with_counts;

create view public.challenges_with_counts as
select
  c.*,
  (c.created_at + (c.duration_days || ' days')::interval) as end_at,
  (
    select count(*)::int
    from public.challenge_members m
    where m.challenge_id = c.id and m.status = 'joined'
  ) as participants
from public.challenges c;

-- Grant select permissions
grant select on public.challenges_with_counts to authenticated;