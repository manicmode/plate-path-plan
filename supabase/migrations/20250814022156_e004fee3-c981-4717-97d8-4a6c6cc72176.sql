-- Create verification-only helper functions for testing
CREATE OR REPLACE FUNCTION public._verify_billboard_for(_user uuid)
RETURNS TABLE (id uuid, title text, category text, challenge_type text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT DISTINCT pc.id, pc.title, pc.category, pc.challenge_type, pc.created_at
  FROM public.private_challenges pc
  JOIN public.private_challenge_participations pcp ON pcp.private_challenge_id = pc.id
  WHERE pcp.user_id = _user
    AND COALESCE(pc.challenge_type, 'custom') <> 'rank_of_20'
  ORDER BY pc.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public._verify_active_for(_user uuid)
RETURNS TABLE (id uuid, title text, category text, challenge_type text, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT DISTINCT pc.id, pc.title, pc.category, pc.challenge_type, pc.created_at
  FROM public.private_challenges pc
  JOIN public.private_challenge_participations pcp ON pcp.private_challenge_id = pc.id
  WHERE pcp.user_id = _user
    AND COALESCE(pc.challenge_type, 'custom') <> 'rank_of_20'
  ORDER BY pc.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public._verify_billboard_for(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public._verify_active_for(uuid) TO authenticated;