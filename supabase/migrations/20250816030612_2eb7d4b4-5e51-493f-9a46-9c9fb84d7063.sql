-- Fix the grants (idempotent)
-- Make sure the important RPCs are callable by signed-in users
ALTER FUNCTION public._active_rank20_challenge_id() OWNER TO postgres;
ALTER FUNCTION public.ensure_rank20_membership() OWNER TO postgres;
ALTER FUNCTION public.my_rank20_leaderboard(int,int) OWNER TO postgres;
ALTER FUNCTION public._arena_enroll_for(uuid) OWNER TO postgres;

REVOKE ALL ON FUNCTION public._active_rank20_challenge_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_rank20_leaderboard(int,int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_rank20_membership() FROM PUBLIC;
REVOKE ALL ON FUNCTION public._arena_enroll_for(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public._active_rank20_challenge_id()   TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard(int,int)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_rank20_membership()      TO authenticated;
GRANT EXECUTE ON FUNCTION public._arena_enroll_for(uuid)         TO authenticated;