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
    FROM public.rank20_groups rg
    JOIN public.rank20_members rm ON rm.group_id = rg.id
    WHERE rg.challenge_id = rank20_chat_messages.challenge_id
      AND rm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert chat messages for their rank20 groups"
ON public.rank20_chat_messages
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.rank20_groups rg
    JOIN public.rank20_members rm ON rm.group_id = rg.id
    WHERE rg.challenge_id = rank20_chat_messages.challenge_id
      AND rm.user_id = auth.uid()
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
    JOIN public.rank20_groups rg ON rg.challenge_id = cm.challenge_id
    JOIN public.rank20_members rm ON rm.group_id = rg.id
    WHERE cm.id = rank20_chat_reactions.message_id
      AND rm.user_id = auth.uid()
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
    JOIN public.rank20_groups rg ON rg.challenge_id = cm.challenge_id
    JOIN public.rank20_members rm ON rm.group_id = rg.id
    WHERE cm.id = rank20_chat_reactions.message_id
      AND rm.user_id = auth.uid()
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
    JOIN public.rank20_groups rg ON rg.challenge_id = cm.challenge_id
    JOIN public.rank20_members rm ON rm.group_id = rg.id
    WHERE cm.id = rank20_chat_reactions.message_id
      AND rm.user_id = auth.uid()
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
    FROM public.rank20_groups rg
    JOIN public.rank20_members rm ON rm.group_id = rg.id
    WHERE rg.challenge_id = rank20_billboard_messages.challenge_id
      AND rm.user_id = auth.uid()
  )
);

-- 4) SAFE LEADERBOARD ACCESS (using existing my_rank20_members function)

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
  WITH members_data AS (
    SELECT user_id, display_name, avatar_url
    FROM public.my_rank20_members()
  )
  SELECT
    md.user_id,
    md.display_name,
    md.avatar_url,
    (COALESCE(v.nutrition_streak, 0) * 10 + COALESCE(v.hydration_streak, 0) * 5 + COALESCE(v.supplement_streak, 0) * 3) AS points,
    GREATEST(COALESCE(v.nutrition_streak, 0), COALESCE(v.hydration_streak, 0), COALESCE(v.supplement_streak, 0)) AS streak
  FROM members_data md
  LEFT JOIN public.arena_leaderboard_view v ON v.user_id = md.user_id
  ORDER BY points DESC, streak DESC;
$$;

-- Lock down execute perms (no PUBLIC)
REVOKE ALL ON FUNCTION public.my_rank20_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard() TO authenticated, service_role;