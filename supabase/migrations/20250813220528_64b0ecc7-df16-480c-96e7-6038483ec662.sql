-- Fix the assign_rank20 function - disambiguate the variable name
create or replace function public.assign_rank20(_user_id uuid)
returns table(group_id uuid, challenge_id uuid, batch_number bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  group_rec record;
  members_count int;
begin
  select gr.* into group_rec
  from public.rank20_groups gr
  where not gr.is_closed
  order by gr.batch_number asc
  limit 1
  for update skip locked;

  if not found then
    insert into public.rank20_groups default values returning * into group_rec;
  end if;

  group_rec.challenge_id := public._ensure_rank20_challenge(group_rec.id);

  insert into public.rank20_members (group_id, user_id)
  values (group_rec.id, _user_id)
  on conflict do nothing;

  insert into public.private_challenge_participations (private_challenge_id, user_id)
  values (group_rec.challenge_id, _user_id)
  on conflict do nothing;

  select count(*) into members_count from public.rank20_members where group_id = group_rec.id;
  if members_count >= 20 then
    update public.rank20_groups set is_closed = true where id = group_rec.id;
  end if;

  return query select group_rec.id, group_rec.challenge_id, group_rec.batch_number;
end
$$;