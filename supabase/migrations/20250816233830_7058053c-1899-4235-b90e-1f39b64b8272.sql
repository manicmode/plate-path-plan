-- Complete app_notifications permissions and read functionality

-- 1) Grant SELECT permission to authenticated users (RLS already restricts to own rows)
GRANT SELECT ON TABLE public.app_notifications TO authenticated;

-- 2) Add UPDATE policy for marking notifications as read (tight RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='app_notifications' AND policyname='p_app_notifs_update_read'
  ) THEN
    CREATE POLICY p_app_notifs_update_read
    ON public.app_notifications
    FOR UPDATE TO authenticated
    USING  (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());  -- Only their own rows
  END IF;
END $$;

-- 3) Secure RPC to mark specific notifications as read
CREATE OR REPLACE FUNCTION public.app_notifs_mark_read(p_ids uuid[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.app_notifications
  SET read_at = now()
  WHERE id = ANY(p_ids) AND user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.app_notifs_mark_read(uuid[]) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.app_notifs_mark_read(uuid[]) TO authenticated;
ALTER FUNCTION public.app_notifs_mark_read(uuid[]) OWNER TO postgres;

-- 4) Convenience RPC to mark all user's notifications as read
CREATE OR REPLACE FUNCTION public.app_notifs_mark_all_read()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.app_notifications
  SET read_at = now()
  WHERE user_id = auth.uid() AND read_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.app_notifs_mark_all_read() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.app_notifs_mark_all_read() TO authenticated;
ALTER FUNCTION public.app_notifs_mark_all_read() OWNER TO postgres;