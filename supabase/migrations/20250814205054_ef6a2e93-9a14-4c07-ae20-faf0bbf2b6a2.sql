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
  -- all rank_of_20 challenges the caller is in
  WITH my_rank20 AS (
    SELECT pcp.private_challenge_id
    FROM public.private_challenge_participations pcp
    JOIN public.private_challenges pc
      ON pc.id = pcp.private_challenge_id
    WHERE pcp.user_id = auth.uid()
      AND pc.challenge_type = 'rank_of_20'
    GROUP BY pcp.private_challenge_id
  ),
  ranked AS (
    SELECT
      m.private_challenge_id,
      -- participant count for each challenge
      (SELECT count(*) FROM public.private_challenge_participations x
        WHERE x.private_challenge_id = m.private_challenge_id) AS member_count,
      -- recent activity to break ties
      (SELECT max(x.joined_at) FROM public.private_challenge_participations x
        WHERE x.private_challenge_id = m.private_challenge_id) AS last_joined
    FROM my_rank20 m
  ),
  chosen AS (
    SELECT private_challenge_id
    FROM ranked
    ORDER BY member_count DESC, last_joined DESC
    LIMIT 1
  )
  SELECT
    pcp.user_id,
    COALESCE(NULLIF(TRIM(up.first_name || ' ' || up.last_name), ''),
             'User ' || substr(pcp.user_id::text, 1, 5)) AS display_name,
    up.avatar_url,
    pcp.joined_at
  FROM public.private_challenge_participations pcp
  JOIN chosen c ON c.private_challenge_id = pcp.private_challenge_id
  LEFT JOIN public.user_profiles up ON up.user_id = pcp.user_id
  ORDER BY display_name NULLS LAST, pcp.user_id;
$$;