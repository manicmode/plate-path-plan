create or replace function public.my_rank20_chosen_challenge_id()
returns table (private_challenge_id uuid, member_count int)
language sql
security definer
set search_path = public, pg_catalog
as $$
  with my_rank20 as (
    select pcp.private_challenge_id
    from public.private_challenge_participations pcp
    join public.private_challenges pc on pc.id = pcp.private_challenge_id
    where pcp.user_id = auth.uid()
      and pc.challenge_type = 'rank_of_20'
    group by pcp.private_challenge_id
  ),
  ranked as (
    select
      m.private_challenge_id,
      (select count(*) from public.private_challenge_participations x
       where x.private_challenge_id = m.private_challenge_id) as member_count,
      (select max(x.joined_at) from public.private_challenge_participations x
       where x.private_challenge_id = m.private_challenge_id) as last_joined
    from my_rank20 m
  )
  select private_challenge_id, member_count
  from ranked
  order by member_count desc, last_joined desc
  limit 1;
$$;