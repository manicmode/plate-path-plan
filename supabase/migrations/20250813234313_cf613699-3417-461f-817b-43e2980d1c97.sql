-- Fix the Rank-of-20 challenge type and ensure current user participation
update public.private_challenges 
set challenge_type = 'rank_of_20' 
where title = 'Rank of 20' and challenge_type = 'custom';

-- Ensure current user is assigned to Rank-of-20 via the assign_rank20 function
select public.assign_rank20(auth.uid()) where auth.uid() is not null;