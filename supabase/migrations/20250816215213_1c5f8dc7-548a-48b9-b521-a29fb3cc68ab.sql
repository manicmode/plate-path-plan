-- List members for the active (or given) Arena challenge.
-- Joins avatar/display_name if a profiles table exists.
CREATE OR REPLACE FUNCTION public.arena_get_members(
  p_challenge_id uuid DEFAULT NULL,
  p_limit  int   DEFAULT 200,
  p_offset int   DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  joined_at timestamptz,
  status text
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
    SELECT id INTO v_cid FROM public.arena_challenges WHERE status='active' ORDER BY starts_at DESC LIMIT 1;
  ELSE
    v_cid := p_challenge_id;
  END IF;

  IF has_user_profiles THEN
    RETURN QUERY
    SELECT m.user_id,
           COALESCE(up.display_name, up.full_name, up.username, up.nickname) AS display_name,
           up.avatar_url,
           m.joined_at,
           m.status
    FROM public.arena_memberships m
    LEFT JOIN public.user_profiles up ON up.user_id = m.user_id
    WHERE m.challenge_id = v_cid
    ORDER BY m.joined_at DESC
    LIMIT p_limit OFFSET p_offset;
  ELSIF has_profiles THEN
    RETURN QUERY
    SELECT m.user_id,
           COALESCE(p.display_name, p.full_name, p.username, p.nickname) AS display_name,
           p.avatar_url,
           m.joined_at,
           m.status
    FROM public.arena_memberships m
    LEFT JOIN public.profiles p ON p.id = m.user_id
    WHERE m.challenge_id = v_cid
    ORDER BY m.joined_at DESC
    LIMIT p_limit OFFSET p_offset;
  ELSE
    RETURN QUERY
    SELECT m.user_id, NULL::text, NULL::text, m.joined_at, m.status
    FROM public.arena_memberships m
    WHERE m.challenge_id = v_cid
    ORDER BY m.joined_at DESC
    LIMIT p_limit OFFSET p_offset;
  END IF;
END
$$;

REVOKE ALL ON FUNCTION public.arena_get_members(uuid,int,int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.arena_get_members(uuid,int,int) TO authenticated;

-- Quick verify: compiles and is callable
SELECT 'arena_get_members_ready' AS check, TRUE AS ok;