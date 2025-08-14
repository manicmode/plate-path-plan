-- Billboard Chat Real Names: RLS + RPCs for billboard_comments with user profiles
-- A) RLS policies for profiles table (idempotent)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- General profiles read policy for any shared private challenge participants
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname='profiles_select_challenge_peers'
      AND tablename='profiles' AND schemaname='public'
  ) THEN
    CREATE POLICY profiles_select_challenge_peers ON public.profiles
      FOR SELECT USING (
        -- Same private challenge (any type) OR self
        EXISTS (
          SELECT 1
          FROM public.private_challenge_participations p1
          JOIN public.private_challenge_participations p2
            ON p1.private_challenge_id = p2.private_challenge_id
          WHERE p1.user_id = public.profiles.user_id
            AND p2.user_id = auth.uid()
        )
        OR public.profiles.user_id = auth.uid()
      );
  END IF;
END$$;

-- B) RPCs for Billboard chat with user names from profiles
-- List billboard comments with display names for a given challenge/event
CREATE OR REPLACE FUNCTION public.my_billboard_comments_list(
  _event_id uuid,
  _limit int DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  user_id uuid,
  body text,
  created_at timestamptz,
  display_name text,
  avatar_url text
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT
    c.id, c.event_id, c.user_id, c.body, c.created_at,
    COALESCE(p.display_name, 'User ' || SUBSTR(c.user_id::text, 1, 5)) as display_name,
    p.avatar_url
  FROM public.billboard_comments c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE c.event_id = _event_id
    -- Ensure user can access this event via challenge membership
    AND EXISTS (
      SELECT 1 FROM public.billboard_events e
      JOIN public.private_challenges pc ON pc.id = e.challenge_id
      LEFT JOIN public.private_challenge_participations pcp ON pcp.private_challenge_id = pc.id
      WHERE e.id = c.event_id
        AND (pc.creator_id = auth.uid() OR pcp.user_id = auth.uid())
    )
  ORDER BY c.created_at ASC
  LIMIT COALESCE(_limit, 50);
$$;
GRANT EXECUTE ON FUNCTION public.my_billboard_comments_list(uuid,int) TO authenticated;

-- Post a billboard comment with proper authorization
CREATE OR REPLACE FUNCTION public.my_billboard_comment_post(
  _event_id uuid,
  _body text
)
RETURNS TABLE (
  id uuid,
  event_id uuid,
  user_id uuid,
  body text,
  created_at timestamptz,
  display_name text,
  avatar_url text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  new_comment_id uuid;
BEGIN
  -- Validate input
  IF _body IS NULL OR LENGTH(TRIM(_body)) = 0 OR LENGTH(_body) > 2000 THEN
    RETURN;
  END IF;

  -- Must be a member of the challenge that owns this event
  IF NOT EXISTS (
    SELECT 1 FROM public.billboard_events e
    JOIN public.private_challenges pc ON pc.id = e.challenge_id
    LEFT JOIN public.private_challenge_participations p ON p.private_challenge_id = pc.id
    WHERE e.id = _event_id
      AND (pc.creator_id = auth.uid() OR p.user_id = auth.uid())
  ) THEN
    RETURN;
  END IF;

  -- Insert the comment
  INSERT INTO public.billboard_comments (event_id, user_id, body)
  VALUES (_event_id, auth.uid(), TRIM(_body))
  RETURNING billboard_comments.id INTO new_comment_id;

  -- Return the comment with profile data
  RETURN QUERY
  SELECT
    c.id, c.event_id, c.user_id, c.body, c.created_at,
    COALESCE(p.display_name, 'User ' || SUBSTR(c.user_id::text, 1, 5)) as display_name,
    p.avatar_url
  FROM public.billboard_comments c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE c.id = new_comment_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.my_billboard_comment_post(uuid,text) TO authenticated;