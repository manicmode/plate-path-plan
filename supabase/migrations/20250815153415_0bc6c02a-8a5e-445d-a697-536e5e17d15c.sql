-- Step 1: Arena RPC with NULLIF guards and better fallbacks
CREATE OR REPLACE FUNCTION public.my_rank20_members()
RETURNS TABLE(user_id uuid, group_id uuid, display_name text, avatar_url text, joined_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH my_group AS (
    SELECT group_id
    FROM public.rank20_members
    WHERE user_id = auth.uid()
    LIMIT 1
  )
  SELECT DISTINCT ON (rm.user_id)
         rm.user_id,
         rm.group_id,
         COALESCE(
           NULLIF(TRIM(CONCAT_WS(' ', up.first_name, up.last_name)), ''),
           NULLIF(up.username, ''),
           NULLIF(SPLIT_PART(au.email, '@', 1), ''),
           'Unknown'
         ) AS display_name,
         up.avatar_url,
         rm.joined_at
  FROM public.rank20_members rm
  JOIN my_group mg ON mg.group_id = rm.group_id
  LEFT JOIN public.user_profiles up ON up.user_id = rm.user_id
  LEFT JOIN auth.users au ON au.id = rm.user_id
  -- deterministic pick per user: earliest join
  ORDER BY rm.user_id, rm.joined_at ASC;
$$;

-- Best index for this query pattern
CREATE INDEX IF NOT EXISTS idx_rank20_members_group_user_joined
  ON public.rank20_members (group_id, user_id, joined_at);