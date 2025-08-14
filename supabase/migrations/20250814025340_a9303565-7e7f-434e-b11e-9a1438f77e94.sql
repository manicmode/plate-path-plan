-- Arena Billboard & Chat tables for Rank-of-20 groups

-- Latest announcement (one visible at a time in UI)
CREATE TABLE IF NOT EXISTS public.rank20_billboard_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL,
  author_id UUID,
  title TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rank20_billboard_challenge_created
  ON public.rank20_billboard_messages (challenge_id, created_at DESC);

-- Group chat messages
CREATE TABLE IF NOT EXISTS public.rank20_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL,
  user_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rank20_chat_challenge_created
  ON public.rank20_chat_messages (challenge_id, created_at DESC);

-- RLS policies for billboard messages
ALTER TABLE public.rank20_billboard_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view billboard messages for their rank20 groups" 
ON public.rank20_billboard_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM private_challenges pc
  JOIN private_challenge_participations p ON p.private_challenge_id = pc.id
  WHERE pc.id = rank20_billboard_messages.challenge_id 
    AND pc.challenge_type = 'rank_of_20'
    AND p.user_id = auth.uid()
));

-- RLS policies for chat messages
ALTER TABLE public.rank20_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chat messages for their rank20 groups" 
ON public.rank20_chat_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 
  FROM private_challenges pc
  JOIN private_challenge_participations p ON p.private_challenge_id = pc.id
  WHERE pc.id = rank20_chat_messages.challenge_id 
    AND pc.challenge_type = 'rank_of_20'
    AND p.user_id = auth.uid()
));

CREATE POLICY "Users can insert chat messages for their rank20 groups" 
ON public.rank20_chat_messages 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 
    FROM private_challenges pc
    JOIN private_challenge_participations p ON p.private_challenge_id = pc.id
    WHERE pc.id = rank20_chat_messages.challenge_id 
      AND pc.challenge_type = 'rank_of_20'
      AND p.user_id = auth.uid()
  )
);

-- Current user's Rank-of-20 challenge id
CREATE OR REPLACE FUNCTION public.my_rank20_challenge_id()
RETURNS UUID
LANGUAGE SQL SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT pc.id
  FROM private_challenges pc
  JOIN private_challenge_participations p ON p.private_challenge_id = pc.id
  WHERE pc.challenge_type = 'rank_of_20'
    AND p.user_id = auth.uid()
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.my_rank20_challenge_id() TO authenticated;

-- Latest single announcement for the user's group
CREATE OR REPLACE FUNCTION public.my_rank20_latest_announcement()
RETURNS TABLE (id UUID, title TEXT, body TEXT, created_at TIMESTAMPTZ)
LANGUAGE SQL SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT a.id, a.title, a.body, a.created_at
  FROM public.rank20_billboard_messages a
  JOIN private_challenges pc ON pc.id = a.challenge_id
  JOIN private_challenge_participations p ON p.private_challenge_id = pc.id
  WHERE pc.challenge_type = 'rank_of_20'
    AND p.user_id = auth.uid()
  ORDER BY a.created_at DESC
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.my_rank20_latest_announcement() TO authenticated;

-- Chat list (paged)
CREATE OR REPLACE FUNCTION public.my_rank20_chat_list(_limit INT DEFAULT 50, _before TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (id UUID, user_id UUID, body TEXT, created_at TIMESTAMPTZ)
LANGUAGE SQL SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT c.id, c.user_id, c.body, c.created_at
  FROM public.rank20_chat_messages c
  JOIN private_challenges pc ON pc.id = c.challenge_id
  JOIN private_challenge_participations p ON p.private_challenge_id = pc.id
  WHERE pc.challenge_type = 'rank_of_20'
    AND p.user_id = auth.uid()
    AND (_before IS NULL OR c.created_at < _before)
  ORDER BY c.created_at DESC
  LIMIT COALESCE(_limit, 50);
$$;
GRANT EXECUTE ON FUNCTION public.my_rank20_chat_list(INT, TIMESTAMPTZ) TO authenticated;

-- Post a chat message
CREATE OR REPLACE FUNCTION public.my_rank20_chat_post(_body TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE 
  challenge_id UUID;
BEGIN
  IF _body IS NULL OR length(trim(_body)) = 0 THEN 
    RETURN; 
  END IF;

  SELECT pc.id INTO challenge_id
  FROM private_challenges pc
  JOIN private_challenge_participations p ON p.private_challenge_id = pc.id
  WHERE pc.challenge_type = 'rank_of_20'
    AND p.user_id = auth.uid()
  LIMIT 1;

  IF challenge_id IS NULL THEN 
    RETURN; 
  END IF;

  INSERT INTO public.rank20_chat_messages (challenge_id, user_id, body)
  VALUES (challenge_id, auth.uid(), _body);
END;
$$;
GRANT EXECUTE ON FUNCTION public.my_rank20_chat_post(TEXT) TO authenticated;