-- Create probe function with correct syntax
CREATE OR REPLACE FUNCTION public._probe_leaderboard_rpc(p_user uuid)
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
  RETURN QUERY SELECT * FROM public.my_rank20_leaderboard(50,0);
END $$;

ALTER FUNCTION public._probe_leaderboard_rpc(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public._probe_leaderboard_rpc(uuid) FROM PUBLIC;