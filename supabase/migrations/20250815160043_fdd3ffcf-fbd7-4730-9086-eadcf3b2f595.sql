-- Fix Arena RLS policies for same-group membership and leaderboard access

-- 1) MESSAGES
DROP POLICY IF EXISTS "Users can view chat messages for their rank20 groups" ON public.rank20_chat_messages;
DROP POLICY IF EXISTS "Users can insert chat messages for their rank20 groups" ON public.rank20_chat_messages;

CREATE POLICY "Users can view chat messages for their rank20 groups"
ON public.rank20_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.private_challenges pc
    WHERE pc.id = rank20_chat_messages.challenge_id
      AND pc.challenge_type = 'rank_of_20'
      AND pc.group_id IN (
        SELECT group_id FROM public.rank20_members WHERE user_id = auth.uid()
      )
  )
);

CREATE POLICY "Users can insert chat messages for their rank20 groups"
ON public.rank20_chat_messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.private_challenges pc
    WHERE pc.id = rank20_chat_messages.challenge_id
      AND pc.challenge_type = 'rank_of_20'
      AND pc.group_id IN (
        SELECT group_id FROM public.rank20_members WHERE user_id = auth.uid()
      )
  )
);

-- 2) REACTIONS
DROP POLICY IF EXISTS "r20_react_select" ON public.rank20_chat_reactions;
DROP POLICY IF EXISTS "r20_react_insert" ON public.rank20_chat_reactions;
DROP POLICY IF EXISTS "r20_react_delete" ON public.rank20_chat_reactions;

CREATE POLICY "r20_react_select"
ON public.rank20_chat_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.rank20_chat_messages cm
    JOIN public.private_challenges pc ON pc.id = cm.challenge_id
    WHERE cm.id = rank20_chat_reactions.message_id
      AND pc.challenge_type = 'rank_of_20'
      AND pc.group_id IN (
        SELECT group_id FROM public.rank20_members WHERE user_id = auth.uid()
      )
  )
);

CREATE POLICY "r20_react_insert"
ON public.rank20_chat_reactions
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.rank20_chat_messages cm
    JOIN public.private_challenges pc ON pc.id = cm.challenge_id
    WHERE cm.id = rank20_chat_reactions.message_id
      AND pc.challenge_type = 'rank_of_20'
      AND pc.group_id IN (
        SELECT group_id FROM public.rank20_members WHERE user_id = auth.uid()
      )
  )
);

CREATE POLICY "r20_react_delete"
ON public.rank20_chat_reactions
FOR DELETE
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.rank20_chat_messages cm
    JOIN public.private_challenges pc ON pc.id = cm.challenge_id
    WHERE cm.id = rank20_chat_reactions.message_id
      AND pc.challenge_type = 'rank_of_20'
      AND pc.group_id IN (
        SELECT group_id FROM public.rank20_members WHERE user_id = auth.uid()
      )
  )
);

-- 3) BILLBOARD
DROP POLICY IF EXISTS "Members can view billboard messages for their rank20 groups" ON public.rank20_billboard_messages;

CREATE POLICY "Members can view billboard messages for their rank20 groups"
ON public.rank20_billboard_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.private_challenges pc
    WHERE pc.id = rank20_billboard_messages.challenge_id
      AND pc.challenge_type = 'rank_of_20'
      AND pc.group_id IN (
        SELECT group_id FROM public.rank20_members WHERE user_id = auth.uid()
      )
  )
);

-- 4) SAFE LEADERBOARD ACCESS (no RLS on views)

-- Drop the view policy attempt (views don't support RLS policies)
-- If it was created in a prior attempt, drop it; otherwise this no-ops.
DO $$
BEGIN
  -- nothing to drop; just a guard block so migration stays idempotent
  NULL;
END $$;

-- Keep the minimal view (optional convenience)
CREATE OR REPLACE VIEW public.arena_leaderboard_view AS
SELECT
  up.user_id,
  up.first_name,
  up.last_name,
  up.avatar_url,
  COALESCE(up.current_nutrition_streak, 0)  AS nutrition_streak,
  COALESCE(up.current_hydration_streak, 0)  AS hydration_streak,
  COALESCE(up.current_supplement_streak, 0) AS supplement_streak
FROM public.user_profiles up;

ALTER VIEW public.arena_leaderboard_view OWNER TO postgres;

-- Authoritative server-side function (bypasses RLS via owner)
CREATE OR REPLACE FUNCTION public.my_rank20_leaderboard()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  points integer,
  streak integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH my_group AS (
    SELECT group_id
    FROM public.rank20_members
    WHERE user_id = auth.uid()
    LIMIT 1
  ),
  members AS (
    SELECT rm.user_id
    FROM public.rank20_members rm
    JOIN my_group g ON g.group_id = rm.group_id
  )
  SELECT
    v.user_id,
    COALESCE(
      NULLIF(TRIM(CONCAT_WS(' ', v.first_name, v.last_name)), ''),
      NULLIF(SPLIT_PART(au.email, '@', 1), ''),
      'Unknown'
    ) AS display_name,
    v.avatar_url,
    (v.nutrition_streak * 10 + v.hydration_streak * 5 + v.supplement_streak * 3) AS points,
    GREATEST(v.nutrition_streak, v.hydration_streak, v.supplement_streak) AS streak
  FROM public.arena_leaderboard_view v
  JOIN members m ON m.user_id = v.user_id
  LEFT JOIN auth.users au ON au.id = v.user_id
  ORDER BY points DESC, streak DESC;
$$;

-- Lock down execute perms (no PUBLIC)
REVOKE ALL ON FUNCTION public.my_rank20_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard() TO authenticated, service_role;