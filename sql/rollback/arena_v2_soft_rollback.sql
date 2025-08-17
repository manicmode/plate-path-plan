-- Arena V2 Soft Rollback Script
-- =====================================
-- WARNING: This is a soft rollback script for Arena V2
-- V1 (rank20_*) code has been completely removed from the application
-- This script only pauses chat functionality and creates data snapshots
-- To restore full functionality, use Arena V2 code with chat re-enabled
-- =====================================

BEGIN;

-- Create backup table if not exists (idempotent)
CREATE TABLE IF NOT EXISTS public._backup_arena_chat_messages (
  LIKE public.arena_chat_messages INCLUDING ALL
);

-- Add rollback metadata
COMMENT ON TABLE public._backup_arena_chat_messages IS 
  'Backup created during Arena V2 soft rollback at ' || now()::text;

-- Copy last 100 messages per group to backup
WITH recent_messages AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY created_at DESC) as rn
  FROM public.arena_chat_messages
)
INSERT INTO public._backup_arena_chat_messages 
SELECT id, group_id, user_id, message, created_at
FROM recent_messages 
WHERE rn <= 100
ON CONFLICT (id) DO NOTHING;

-- Disable realtime publication for arena_chat_messages (idempotent)
-- This stops new realtime subscriptions but doesn't break existing ones
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.arena_chat_messages;

-- Mark Arena functions as in rollback state
COMMENT ON FUNCTION public.arena_get_active_group_id() IS 
  'Arena V2 function - in soft rollback state since ' || now()::text;
  
COMMENT ON FUNCTION public.arena_enroll_me() IS 
  'Arena V2 function - in soft rollback state since ' || now()::text;

-- Mark chat table as in rollback state  
COMMENT ON TABLE public.arena_chat_messages IS 
  'Arena V2 chat table - realtime disabled in soft rollback since ' || now()::text;

-- Create rollback status function for monitoring
CREATE OR REPLACE FUNCTION public.arena_rollback_status()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'rollback_active', true,
    'rollback_time', obj_description('public.arena_chat_messages'::regclass),
    'backup_messages', (SELECT count(*) FROM public._backup_arena_chat_messages),
    'active_messages', (SELECT count(*) FROM public.arena_chat_messages),
    'realtime_disabled', NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'arena_chat_messages'
    )
  );
$$;

COMMENT ON FUNCTION public.arena_rollback_status() IS 
  'Monitor Arena V2 rollback status - created at ' || now()::text;

COMMIT;

-- =====================================
-- Rollback Summary:
-- ✅ Chat realtime subscriptions disabled
-- ✅ Recent messages backed up to _backup_arena_chat_messages  
-- ✅ Functions and tables marked with rollback state
-- ✅ Status monitoring function created
--
-- To monitor rollback status:
--   SELECT public.arena_rollback_status();
--
-- To restore chat realtime (after fixing issues):
--   ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_chat_messages;
--
-- Note: Arena V2 enrollment and leaderboard will continue working
-- Only realtime chat is disabled by this rollback
-- =====================================