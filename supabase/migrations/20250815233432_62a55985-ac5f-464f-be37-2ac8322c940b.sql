-- Create helper function to test Arena enrollment and leaderboard
CREATE OR REPLACE FUNCTION public._arena_join_and_leaderboard(p_user uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  points numeric,
  streak integer,
  rank integer
)
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

  -- Enroll/realign this user into the active Arena (rank_of_20) if needed
  PERFORM public.ensure_rank20_membership();

  -- Return leaderboard rows after enrollment
  RETURN QUERY SELECT * FROM public.my_rank20_leaderboard(20,0);
END
$$;
ALTER FUNCTION public._arena_join_and_leaderboard(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._arena_join_and_leaderboard(uuid) FROM PUBLIC;