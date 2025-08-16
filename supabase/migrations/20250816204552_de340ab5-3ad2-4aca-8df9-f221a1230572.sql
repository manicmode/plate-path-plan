BEGIN;

-- Lock down both functions from PUBLIC
REVOKE ALL ON FUNCTION public.my_rank20_chosen_challenge_id_safe() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_rank20_chosen_challenge_id()       FROM PUBLIC;

-- Grant only to authenticated users
GRANT EXECUTE ON FUNCTION public.my_rank20_chosen_challenge_id_safe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_rank20_chosen_challenge_id()       TO authenticated;

-- Ensure the wrapper runs with a powerful definer (bypasses RLS recursion cleanly)
ALTER FUNCTION public.my_rank20_chosen_challenge_id_safe() OWNER TO postgres;

COMMIT;

-- Smoke test (should return a UUID; if your tool can't run as authenticated, skip)
SELECT public.my_rank20_chosen_challenge_id_safe();