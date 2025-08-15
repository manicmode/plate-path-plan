-- STEP 1: Pick a user for testing
WITH au AS (
  SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1
), rm AS (
  SELECT user_id AS id FROM public.rank20_members LIMIT 1
)
SELECT COALESCE((SELECT id FROM au), (SELECT id FROM rm)) AS test_user_id;

-- STEP 2: Create temporary SECURITY DEFINER wrapper
CREATE OR REPLACE FUNCTION public._arena_realign_for_user(p_user uuid)
RETURNS TABLE(group_id uuid, challenge_id uuid, chosen_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
BEGIN
  -- Simulate authenticated session for p_user
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('role','authenticated','sub',p_user)::text,
    true
  );

  -- Ensure membership (this will realign to active rank_of_20 if needed)
  RETURN QUERY
  WITH ens AS (
    SELECT * FROM ensure_rank20_membership() LIMIT 1
  )
  SELECT ens.group_id, ens.challenge_id,
         (SELECT my_rank20_chosen_challenge_id())
  FROM ens;
END
$$;
ALTER FUNCTION public._arena_realign_for_user(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._arena_realign_for_user(uuid) FROM PUBLIC;