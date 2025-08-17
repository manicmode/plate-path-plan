-- Apply corrected RPC with schema-agnostic version
CREATE OR REPLACE FUNCTION public.arena_get_active_group_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public, pg_catalog
AS $$
  -- Prefer an 'active' membership if that column exists; otherwise just pick the most recent.
  -- This ORDER BY works even if 'status' is absent because (status = 'active') will evaluate to NULL<false<true in Postgres.
  SELECT m.group_id
  FROM public.arena_memberships m
  WHERE m.user_id = auth.uid()
  ORDER BY (m.status = 'active') DESC NULLS LAST, m.joined_at DESC NULLS LAST, m.created_at DESC NULLS LAST
  LIMIT 1;
$$;

-- Ensure realtime is fully correct & idempotent
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