-- Profile-aware leaderboard (handles user_profiles OR profiles; no N+1)
CREATE OR REPLACE FUNCTION public.arena_get_leaderboard_with_profiles(
  p_challenge_id uuid DEFAULT NULL,
  p_section text DEFAULT 'global',
  p_year int DEFAULT date_part('year', now())::int,
  p_month int DEFAULT date_part('month', now())::int,
  p_limit int DEFAULT 100,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  rank int,
  score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid uuid;
  has_user_profiles boolean := to_regclass('public.user_profiles') IS NOT NULL;
  has_profiles      boolean := to_regclass('public.profiles') IS NOT NULL;
BEGIN
  IF p_challenge_id IS NULL THEN
    SELECT id INTO v_cid FROM public.arena_challenges
    WHERE status='active' ORDER BY starts_at DESC LIMIT 1;
  ELSE
    v_cid := p_challenge_id;
  END IF;

  IF has_user_profiles THEN
    RETURN QUERY
    SELECT r.user_id,
           COALESCE(up.display_name, up.full_name, up.username, up.nickname) AS display_name,
           up.avatar_url,
           r.rank,
           r.score
    FROM public.arena_leaderboard_rollups r
    LEFT JOIN public.user_profiles up ON up.user_id = r.user_id
    WHERE r.challenge_id = v_cid
      AND r.section = p_section
      AND r.year = p_year
      AND r.month = p_month
    ORDER BY r.rank
    LIMIT p_limit OFFSET p_offset;
  ELSIF has_profiles THEN
    RETURN QUERY
    SELECT r.user_id,
           COALESCE(p.display_name, p.full_name, p.username, p.nickname) AS display_name,
           p.avatar_url,
           r.rank,
           r.score
    FROM public.arena_leaderboard_rollups r
    LEFT JOIN public.profiles p ON p.id = r.user_id
    WHERE r.challenge_id = v_cid
      AND r.section = p_section
      AND r.year = p_year
      AND r.month = p_month
    ORDER BY r.rank
    LIMIT p_limit OFFSET p_offset;
  ELSE
    RETURN QUERY
    SELECT r.user_id, NULL::text, NULL::text, r.rank, r.score
    FROM public.arena_leaderboard_rollups r
    WHERE r.challenge_id = v_cid
      AND r.section = p_section
      AND r.year = p_year
      AND r.month = p_month
    ORDER BY r.rank
    LIMIT p_limit OFFSET p_offset;
  END IF;
END
$$;

REVOKE ALL ON FUNCTION public.arena_get_leaderboard_with_profiles(uuid,text,int,int,int,int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_get_leaderboard_with_profiles(uuid,text,int,int,int,int) TO authenticated;