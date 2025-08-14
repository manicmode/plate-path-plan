-- Create RPC to return all members in the current user's Rank-of-20 challenge
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
  SELECT
    pcp.user_id,
    COALESCE(pr.display_name, 'User ' || substr(pcp.user_id::text, 1, 5)) as display_name,
    pr.avatar_url,
    pcp.joined_at
  FROM public.private_challenge_participations pcp
  JOIN public.private_challenges pc ON pc.id = pcp.private_challenge_id
  JOIN public.private_challenge_participations me
    ON me.private_challenge_id = pcp.private_challenge_id
   AND me.user_id = auth.uid()
  LEFT JOIN public.profiles pr ON pr.user_id = pcp.user_id
  WHERE pc.challenge_type = 'rank_of_20'
  ORDER BY pr.display_name NULLS LAST, pcp.user_id;
$$;