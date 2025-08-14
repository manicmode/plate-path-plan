-- Fix my_rank20_group_members to return all participants in user's rank_of_20 challenge
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
  -- 1) Find one active rank_of_20 challenge the caller is in
  WITH user_challenge AS (
    SELECT pcp.private_challenge_id
    FROM public.private_challenge_participations pcp
    JOIN public.private_challenges pc 
      ON pc.id = pcp.private_challenge_id
    WHERE pcp.user_id = auth.uid()
      AND pc.challenge_type = 'rank_of_20'
    ORDER BY pcp.joined_at DESC
    LIMIT 1
  )
  -- 2) Return ALL participants of that challenge
  SELECT
    pcp.user_id,
    COALESCE(
      NULLIF(TRIM(up.first_name || ' ' || up.last_name), ''),
      'User ' || substr(pcp.user_id::text, 1, 5)
    ) AS display_name,
    up.avatar_url,
    pcp.joined_at
  FROM public.private_challenge_participations pcp
  JOIN user_challenge uc
    ON uc.private_challenge_id = pcp.private_challenge_id
  LEFT JOIN public.user_profiles up
    ON up.id = pcp.user_id
  ORDER BY display_name NULLS LAST, pcp.user_id;
$$;