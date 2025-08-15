-- Recreate the helper temporarily for verification
CREATE OR REPLACE FUNCTION public._arena_realign_for_user(p_user uuid)
RETURNS TABLE(group_id uuid, challenge_id uuid, chosen_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('role','authenticated','sub',p_user)::text,
    true
  );
  RETURN QUERY
  WITH ens AS (
    SELECT * FROM ensure_rank20_membership() LIMIT 1
  )
  SELECT ens.group_id, ens.challenge_id,
         (SELECT public._active_rank20_challenge_id())
  FROM ens;
END
$$;

-- 1) First query result
SELECT * FROM public._arena_realign_for_user('f8458f5c-cd73-44ba-a818-6996d23e454b');

-- 2) Second query result
WITH g AS (
  SELECT * FROM public._arena_realign_for_user('f8458f5c-cd73-44ba-a818-6996d23e454b')
)
SELECT g.group_id, g.challenge_id, pc.category, pc.status, pc.start_date, pc.duration_days
FROM g
LEFT JOIN public.private_challenges pc ON pc.id = g.challenge_id;

-- 3) Drop the helper
DROP FUNCTION public._arena_realign_for_user(uuid);