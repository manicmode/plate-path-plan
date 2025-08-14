-- Fix my_rank20_group_members function to use correct join column
CREATE OR REPLACE FUNCTION public.my_rank20_group_members()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  joined_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH user_challenge AS (
    SELECT pcp.private_challenge_id
    FROM public.private_challenge_participations pcp
    JOIN public.private_challenges pc ON pc.id = pcp.private_challenge_id
    WHERE pcp.user_id = auth.uid()
      AND pc.challenge_type = 'rank_of_20'
    ORDER BY pcp.joined_at DESC
    LIMIT 1
  )
  SELECT
    pcp.user_id,
    COALESCE(NULLIF(TRIM(up.first_name || ' ' || up.last_name), ''), 'User ' || substr(pcp.user_id::text, 1, 5)) AS display_name,
    up.avatar_url,
    pcp.joined_at
  FROM public.private_challenge_participations pcp
  JOIN user_challenge uc ON uc.private_challenge_id = pcp.private_challenge_id
  LEFT JOIN public.user_profiles up ON up.user_id = pcp.user_id
  ORDER BY display_name NULLS LAST, pcp.user_id;
$$;