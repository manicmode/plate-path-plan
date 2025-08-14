-- Create RPC for "My Active Private Challenges" (excludes Rank-of-20)
CREATE OR REPLACE FUNCTION public.my_active_private_challenges()
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  challenge_type text,
  created_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT DISTINCT
    pc.id,
    pc.title,
    pc.category,
    pc.challenge_type,
    pc.created_at
  FROM public.private_challenges pc
  JOIN public.private_challenge_participations pcp
    ON pcp.private_challenge_id = pc.id
  WHERE pcp.user_id = auth.uid()
    AND COALESCE(pc.challenge_type, 'custom') <> 'rank_of_20'
  ORDER BY pc.created_at DESC;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.my_active_private_challenges() TO authenticated;