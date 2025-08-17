-- Create V2 Arena RPCs based on actual schema (fixed user_profiles references)

-- A) Active challenge finder
CREATE OR REPLACE FUNCTION public.arena_get_active_challenge()
RETURNS TABLE (id uuid, slug text, title text, season_year int, season_month int, starts_at timestamptz, ends_at timestamptz, metadata jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT c.id, c.slug, c.title, c.season_year, c.season_month, c.starts_at, c.ends_at, c.metadata
  FROM public.arena_challenges c
  WHERE c.status = 'active'
     OR (c.season_year = date_part('year', now())::int
         AND c.season_month = date_part('month', now())::int)
  ORDER BY (c.status = 'active') DESC, c.created_at DESC
  LIMIT 1;
$$;

-- B) Members roster (all enrolled users, even 0 pts)
CREATE OR REPLACE FUNCTION public.arena_get_members(
  p_challenge_id uuid DEFAULT NULL,
  p_limit int DEFAULT 200,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  joined_at timestamptz,
  status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH act AS (
    SELECT id FROM public.arena_get_active_challenge() LIMIT 1
  )
  SELECT m.user_id,
         COALESCE(
           NULLIF(TRIM(CONCAT(p.first_name,' ',p.last_name)), ''), 
           p.first_name, 
           p.last_name, 
           m.user_id::text
         ) AS display_name,
         p.avatar_url,
         m.joined_at,
         m.status
  FROM public.arena_memberships m
  JOIN act ON TRUE
  LEFT JOIN public.user_profiles p ON p.user_id = m.user_id
  WHERE m.challenge_id = COALESCE(p_challenge_id, act.id)
    AND m.status = 'active'
  ORDER BY display_name ASC
  LIMIT p_limit OFFSET p_offset;
$$;

-- C) Leaderboard with profiles (ranked current period)
CREATE OR REPLACE FUNCTION public.arena_get_leaderboard_with_profiles(
  p_challenge_id uuid DEFAULT NULL,
  p_section text DEFAULT 'global',
  p_year int DEFAULT NULL,
  p_month int DEFAULT NULL,
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH act AS (
    SELECT id, season_year, season_month FROM public.arena_get_active_challenge() LIMIT 1
  )
  SELECT r.user_id,
         COALESCE(
           NULLIF(TRIM(CONCAT(p.first_name,' ',p.last_name)), ''), 
           p.first_name, 
           p.last_name, 
           r.user_id::text
         ) AS display_name,
         p.avatar_url,
         r.rank,
         r.score
  FROM public.arena_leaderboard_rollups r
  JOIN act ON TRUE
  LEFT JOIN public.user_profiles p ON p.user_id = r.user_id
  WHERE r.challenge_id = COALESCE(p_challenge_id, act.id)
    AND r.year = COALESCE(p_year, act.season_year, date_part('year', now())::int)
    AND r.month = COALESCE(p_month, act.season_month, date_part('month', now())::int)
    AND r.section = COALESCE(p_section, 'global')
  ORDER BY r.rank ASC NULLS LAST, r.score DESC NULLS LAST, display_name ASC
  LIMIT p_limit OFFSET p_offset;
$$;

-- D) Self-enrollment helper (idempotent)
CREATE OR REPLACE FUNCTION public.arena_enroll_me(
  p_challenge_id uuid DEFAULT NULL
)
RETURNS TABLE (enrolled boolean, challenge_id uuid, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_challenge_id uuid;
  v_user_id uuid := auth.uid();
  v_existed boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get target challenge
  IF p_challenge_id IS NOT NULL THEN
    v_challenge_id := p_challenge_id;
  ELSE
    SELECT id INTO v_challenge_id FROM public.arena_get_active_challenge() LIMIT 1;
  END IF;
  
  IF v_challenge_id IS NULL THEN
    RAISE EXCEPTION 'No active challenge found';
  END IF;

  -- Check if already enrolled
  SELECT EXISTS(
    SELECT 1 FROM public.arena_memberships 
    WHERE challenge_id = v_challenge_id AND user_id = v_user_id
  ) INTO v_existed;

  -- Insert if not exists
  IF NOT v_existed THEN
    INSERT INTO public.arena_memberships (challenge_id, user_id, status)
    VALUES (v_challenge_id, v_user_id, 'active');
  END IF;

  RETURN QUERY SELECT NOT v_existed, v_challenge_id, v_user_id;
END;
$$;

-- E) Get my membership status  
CREATE OR REPLACE FUNCTION public.arena_get_my_membership(
  p_challenge_id uuid DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  challenge_id uuid,
  status text,
  joined_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH act AS (
    SELECT id FROM public.arena_get_active_challenge() LIMIT 1
  )
  SELECT m.user_id, m.challenge_id, m.status, m.joined_at
  FROM public.arena_memberships m
  JOIN act ON TRUE
  WHERE m.challenge_id = COALESCE(p_challenge_id, act.id)
    AND m.user_id = auth.uid()
  LIMIT 1;
$$;

-- F) Add debug controls feature flag
INSERT INTO public.feature_flags(key, enabled)
VALUES ('arena_debug_controls', false)
ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled;