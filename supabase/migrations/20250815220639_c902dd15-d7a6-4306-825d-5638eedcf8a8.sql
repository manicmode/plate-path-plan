-- STEP 3: Execute realignment test
SELECT * FROM public._arena_realign_for_user('f8458f5c-cd73-44ba-a818-6996d23e454b');

-- Also confirm category linkage for the returned group
WITH g AS (
  SELECT * FROM public._arena_realign_for_user('f8458f5c-cd73-44ba-a818-6996d23e454b')
)
SELECT g.group_id, g.challenge_id, pc.category, pc.status, pc.start_date, pc.duration_days
FROM g
LEFT JOIN public.private_challenges pc ON pc.id = g.challenge_id;

-- STEP 4: Clean up
DROP FUNCTION public._arena_realign_for_user(uuid);