-- Fix permissions for testing functions
GRANT EXECUTE ON FUNCTION public._active_rank20_challenge_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public._arena_enroll_for(uuid) TO authenticated;