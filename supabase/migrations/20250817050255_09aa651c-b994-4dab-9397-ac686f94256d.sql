-- 1) Create arena_chat_messages table
CREATE TABLE IF NOT EXISTS public.arena_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  message text NOT NULL CHECK (length(message) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Create index
CREATE INDEX IF NOT EXISTS idx_arena_chat_messages_group_time
  ON public.arena_chat_messages (group_id, created_at DESC);

-- 3) Enable RLS
ALTER TABLE public.arena_chat_messages ENABLE ROW LEVEL SECURITY;

-- 4) Create RLS policies
DROP POLICY IF EXISTS arena_chat_select ON public.arena_chat_messages;
CREATE POLICY arena_chat_select ON public.arena_chat_messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.arena_memberships m
    WHERE m.group_id = arena_chat_messages.group_id
      AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS arena_chat_insert ON public.arena_chat_messages;
CREATE POLICY arena_chat_insert ON public.arena_chat_messages
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.arena_memberships m
    WHERE m.group_id = arena_chat_messages.group_id
      AND m.user_id = auth.uid()
  )
);

-- 5) Create corrected RPC with only existing columns
CREATE OR REPLACE FUNCTION public.arena_get_active_group_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
  SELECT m.group_id
  FROM public.arena_memberships m
  WHERE m.user_id = auth.uid()
  ORDER BY (m.status = 'active') DESC NULLS LAST, m.joined_at DESC NULLS LAST
  LIMIT 1;
$$;

-- 6) Setup realtime
ALTER TABLE public.arena_chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname='supabase_realtime'
      AND schemaname='public'
      AND tablename='arena_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_chat_messages;
  END IF;
END $$;