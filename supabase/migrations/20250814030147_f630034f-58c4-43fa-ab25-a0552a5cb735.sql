-- Harden Arena Billboard & Chat feature

-- Add Foreign Keys for data integrity
ALTER TABLE public.rank20_billboard_messages 
ADD CONSTRAINT fk_billboard_challenge 
FOREIGN KEY (challenge_id) REFERENCES private_challenges(id) ON DELETE CASCADE;

ALTER TABLE public.rank20_billboard_messages 
ADD CONSTRAINT fk_billboard_author 
FOREIGN KEY (author_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.rank20_chat_messages 
ADD CONSTRAINT fk_chat_challenge 
FOREIGN KEY (challenge_id) REFERENCES private_challenges(id) ON DELETE CASCADE;

ALTER TABLE public.rank20_chat_messages 
ADD CONSTRAINT fk_chat_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add composite index for stable chat pagination
CREATE INDEX IF NOT EXISTS idx_rank20_chat_stable_pagination
ON public.rank20_chat_messages (challenge_id, created_at DESC, id);

-- Drop the old simple index if it exists
DROP INDEX IF EXISTS idx_rank20_chat_challenge_created;

-- Update chat list RPC for stable cursor pagination
CREATE OR REPLACE FUNCTION public.my_rank20_chat_list(
  _limit INT DEFAULT 50, 
  _before_created_at TIMESTAMPTZ DEFAULT NULL,
  _before_id UUID DEFAULT NULL
)
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
    AND (
      _before_created_at IS NULL 
      OR c.created_at < _before_created_at
      OR (c.created_at = _before_created_at AND c.id < _before_id)
    )
  ORDER BY c.created_at DESC, c.id DESC
  LIMIT COALESCE(_limit, 50);
$$;
GRANT EXECUTE ON FUNCTION public.my_rank20_chat_list(INT, TIMESTAMPTZ, UUID) TO authenticated;

-- Update chat post RPC with max length guard
CREATE OR REPLACE FUNCTION public.my_rank20_chat_post(_body TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE 
  challenge_id UUID;
BEGIN
  -- Length guard: max 2000 characters
  IF _body IS NULL OR length(trim(_body)) = 0 OR length(_body) > 2000 THEN 
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
  VALUES (challenge_id, auth.uid(), trim(_body));
END;
$$;
GRANT EXECUTE ON FUNCTION public.my_rank20_chat_post(TEXT) TO authenticated;

-- Seed a test announcement (find the first rank_of_20 challenge)
DO $$
DECLARE
  first_rank20_id UUID;
BEGIN
  SELECT id INTO first_rank20_id
  FROM private_challenges 
  WHERE challenge_type = 'rank_of_20' 
  LIMIT 1;
  
  IF first_rank20_id IS NOT NULL THEN
    INSERT INTO public.rank20_billboard_messages (challenge_id, author_id, title, body)
    VALUES (first_rank20_id, NULL, 'Welcome to Arena', 'Weekly focus: consistency > intensity. 💧');
  END IF;
END $$;