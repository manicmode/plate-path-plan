-- 1) Safety wrapper around existing logic
CREATE OR REPLACE FUNCTION my_rank20_chosen_challenge_id_safe()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.my_rank20_chosen_challenge_id();
$$;

-- 2) Lock down & grant only what we need
REVOKE ALL ON FUNCTION my_rank20_chosen_challenge_id_safe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION my_rank20_chosen_challenge_id_safe() TO authenticated;