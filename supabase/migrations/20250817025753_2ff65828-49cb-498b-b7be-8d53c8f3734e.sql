BEGIN;

-- Drop existing Arena RPC functions if they exist
DROP FUNCTION IF EXISTS public.arena_get_active_challenge();
DROP FUNCTION IF EXISTS public.arena_get_members(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.arena_get_leaderboard_with_profiles(uuid, text, integer, integer, integer, integer);
DROP FUNCTION IF EXISTS public.arena_enroll_me(uuid);
DROP FUNCTION IF EXISTS public.arena_get_my_membership(uuid);

-- Create arena_get_active_challenge function
CREATE OR REPLACE FUNCTION public.arena_get_active_challenge()
RETURNS TABLE(
  id uuid,
  slug text,
  title text,
  season integer,
  year integer,
  month integer,
  start_date date,
  end_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    pc.id,
    'arena-2025' as slug,
    pc.title,
    1 as season,
    EXTRACT(YEAR FROM CURRENT_DATE)::integer as year,
    EXTRACT(MONTH FROM CURRENT_DATE)::integer as month,
    pc.start_date,
    (pc.start_date + INTERVAL '1 day' * pc.duration_days - INTERVAL '1 day')::date as end_date
  FROM private_challenges pc
  WHERE pc.challenge_type = 'rank_of_20'
    AND pc.status = 'active'
  ORDER BY pc.created_at DESC
  LIMIT 1;
$$;

-- Create arena_get_members function
CREATE OR REPLACE FUNCTION public.arena_get_members(
  challenge_id_param uuid DEFAULT NULL,
  limit_param integer DEFAULT 50,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  first_name text,
  last_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    pcp.user_id,
    COALESCE(p.display_name, CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) as display_name,
    p.avatar_url,
    p.first_name,
    p.last_name
  FROM private_challenge_participations pcp
  LEFT JOIN profiles p ON p.user_id = pcp.user_id
  WHERE pcp.private_challenge_id = COALESCE(
    challenge_id_param,
    (SELECT id FROM private_challenges WHERE challenge_type = 'rank_of_20' AND status = 'active' ORDER BY created_at DESC LIMIT 1)
  )
  ORDER BY pcp.joined_at
  LIMIT limit_param OFFSET offset_param;
$$;

-- Create arena_get_leaderboard_with_profiles function
CREATE OR REPLACE FUNCTION public.arena_get_leaderboard_with_profiles(
  challenge_id_param uuid DEFAULT NULL,
  section_param text DEFAULT 'global',
  year_param integer DEFAULT NULL,
  month_param integer DEFAULT NULL,
  limit_param integer DEFAULT 50,
  offset_param integer DEFAULT 0
)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  first_name text,
  last_name text,
  points numeric,
  streak integer,
  rank bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH leaderboard_data AS (
    SELECT 
      ae.user_id,
      COALESCE(SUM(ae.points), 0) as total_points,
      0 as streak_count,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ae.points), 0) DESC) as rank
    FROM arena_events ae
    WHERE ae.challenge_id = COALESCE(
      challenge_id_param,
      (SELECT id FROM private_challenges WHERE challenge_type = 'rank_of_20' AND status = 'active' ORDER BY created_at DESC LIMIT 1)
    )
    AND (year_param IS NULL OR EXTRACT(YEAR FROM ae.occurred_at) = year_param)
    AND (month_param IS NULL OR EXTRACT(MONTH FROM ae.occurred_at) = month_param)
    GROUP BY ae.user_id
  )
  SELECT 
    ld.user_id,
    COALESCE(p.display_name, CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) as display_name,
    p.avatar_url,
    p.first_name,
    p.last_name,
    ld.total_points as points,
    ld.streak_count as streak,
    ld.rank
  FROM leaderboard_data ld
  LEFT JOIN profiles p ON p.user_id = ld.user_id
  ORDER BY ld.rank
  LIMIT limit_param OFFSET offset_param;
$$;

-- Create arena_enroll_me function
CREATE OR REPLACE FUNCTION public.arena_enroll_me(challenge_id_param uuid DEFAULT NULL)
RETURNS TABLE(
  success boolean,
  user_id uuid,
  challenge_id uuid,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  target_challenge_id uuid;
  current_user_id uuid := auth.uid();
BEGIN
  -- Get the challenge ID
  target_challenge_id := COALESCE(
    challenge_id_param,
    (SELECT id FROM private_challenges WHERE challenge_type = 'rank_of_20' AND status = 'active' ORDER BY created_at DESC LIMIT 1)
  );
  
  IF target_challenge_id IS NULL THEN
    RETURN QUERY SELECT false, current_user_id, NULL::uuid, 'No active arena challenge found';
    RETURN;
  END IF;
  
  -- Insert participation (idempotent)
  INSERT INTO private_challenge_participations (private_challenge_id, user_id, is_creator)
  VALUES (target_challenge_id, current_user_id, false)
  ON CONFLICT (private_challenge_id, user_id) DO NOTHING;
  
  RETURN QUERY SELECT true, current_user_id, target_challenge_id, 'Successfully enrolled in arena';
END;
$$;

-- Create arena_get_my_membership function
CREATE OR REPLACE FUNCTION public.arena_get_my_membership(challenge_id_param uuid DEFAULT NULL)
RETURNS TABLE(
  user_id uuid,
  challenge_id uuid,
  joined_at timestamp with time zone,
  is_enrolled boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT 
    pcp.user_id,
    pcp.private_challenge_id as challenge_id,
    pcp.joined_at,
    true as is_enrolled
  FROM private_challenge_participations pcp
  WHERE pcp.user_id = auth.uid()
    AND pcp.private_challenge_id = COALESCE(
      challenge_id_param,
      (SELECT id FROM private_challenges WHERE challenge_type = 'rank_of_20' AND status = 'active' ORDER BY created_at DESC LIMIT 1)
    )
  LIMIT 1;
$$;

-- Add arena_debug_controls feature flag
INSERT INTO public.feature_flags(key, enabled)
VALUES ('arena_debug_controls', false)
ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled;

-- Grant execute permissions
-- Leaderboard and active challenge can be public
GRANT EXECUTE ON FUNCTION public.arena_get_active_challenge() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.arena_get_leaderboard_with_profiles(uuid, text, integer, integer, integer, integer) TO anon, authenticated;

-- Roster, membership, and enrollment should be auth-only
REVOKE EXECUTE ON FUNCTION public.arena_get_members(uuid, integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.arena_get_members(uuid, integer, integer) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.arena_get_my_membership(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.arena_get_my_membership(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.arena_enroll_me(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.arena_enroll_me(uuid) TO authenticated;

COMMIT;