-- Ensure SECURITY DEFINER runs under postgres so RLS can't bite us
ALTER FUNCTION public.arena_get_leaderboard_with_profiles(
  uuid, text, int, int, int, int
) OWNER TO postgres;