-- Add Arena tables to Supabase Realtime publication
-- This enables real-time streaming for chat messages and announcements

-- Add rank20_chat_messages to realtime publication (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'rank20_chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rank20_chat_messages;
    END IF;
END $$;

-- Add rank20_billboard_messages to realtime publication (idempotent)  
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'rank20_billboard_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rank20_billboard_messages;
    END IF;
END $$;