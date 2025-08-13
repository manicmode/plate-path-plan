-- Cleanup: Keep only Batch 14 (group_id: 2086b73b-91a7-4467-ad8b-470411d0341b, challenge_id: e16fa6d3-a395-4d8f-b93b-2d7cf2b89fbe)

-- Remove any extra memberships for the 3 users in other batches
delete from public.rank20_members rm
using public.rank20_groups g
where rm.group_id = g.id
  and g.id <> '2086b73b-91a7-4467-ad8b-470411d0341b'
  and rm.user_id in (
    'f8458f5c-cd73-44ba-a18e-6996d23e454b',
    'ea6022e7-0947-4322-ab30-bfff6774b334',
    '8589c22a-00f5-4e42-a197-fe0dbda7a5d8'
  );

-- Ensure participations point ONLY to the target challenge
delete from public.private_challenge_participations p
using public.private_challenges pc
where p.private_challenge_id = pc.id
  and pc.id <> 'e16fa6d3-a395-4d8f-b93b-2d7cf2b89fbe'
  and lower(pc.title) like 'rank of 20 — batch %'
  and p.user_id in (
    'f8458f5c-cd73-44ba-a18e-6996d23e454b',
    'ea6022e7-0947-4322-ab30-bfff6774b334',
    '8589c22a-00f5-4e42-a197-fe0dbda7a5d8'
  );

-- Delete completely empty stray batches
delete from public.rank20_groups g
where g.id <> '2086b73b-91a7-4467-ad8b-470411d0341b'
  and not exists (select 1 from public.rank20_members m where m.group_id = g.id);