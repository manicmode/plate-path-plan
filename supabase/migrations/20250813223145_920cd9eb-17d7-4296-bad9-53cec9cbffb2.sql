-- More comprehensive cleanup to ensure only Batch 14 remains for our 3 test users

-- Remove the problematic user from Batch 15 and 16 entirely
delete from public.rank20_members 
where user_id = '8589c22a-00f5-4e42-a197-fe0dbd87a5d8'
  and group_id in ('9e4f4598-4f48-4ef1-a38d-79948fb51e3d', '870a29c5-9349-429b-956e-9c2efafa862a');

-- Remove participations for challenges other than Batch 14
delete from public.private_challenge_participations
where user_id = '8589c22a-00f5-4e42-a197-fe0dbd87a5d8'
  and private_challenge_id in ('4d325853-28ef-41f8-9bee-4830fa96d889', 'e7dbf3f4-b5ae-4a51-9857-79de8aff0444');

-- Delete the now-empty groups
delete from public.rank20_groups
where id in ('9e4f4598-4f48-4ef1-a38d-79948fb51e3d', '870a29c5-9349-429b-956e-9c2efafa862a')
  and not exists (select 1 from public.rank20_members m where m.group_id = rank20_groups.id);

-- Delete the orphaned challenges
delete from public.private_challenges
where id in ('4d325853-28ef-41f8-9bee-4830fa96d889', 'e7dbf3f4-b5ae-4a51-9857-79de8aff0444')
  and not exists (select 1 from public.private_challenge_participations p where p.private_challenge_id = private_challenges.id);