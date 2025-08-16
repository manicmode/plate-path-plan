-- Idempotent: add app_notifications to Realtime publication only if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname='supabase_realtime'
      AND schemaname='public'
      AND tablename='app_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
  ELSE
    RAISE NOTICE 'app_notifications already in supabase_realtime; skipping.';
  END IF;
END $$;

-- Fast "my recent notifications" queries (idempotent)
CREATE INDEX IF NOT EXISTS idx_app_notifs_user_created
  ON public.app_notifications (user_id, created_at DESC);