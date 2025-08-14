-- Add Arena tables to Supabase Realtime publication
-- This enables real-time streaming for chat messages and announcements

-- Add rank20_chat_messages to realtime publication (idempotent)
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.rank20_chat_messages;

-- Add rank20_billboard_messages to realtime publication (idempotent)  
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS public.rank20_billboard_messages;