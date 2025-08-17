-- Function: expire pendings older than 30 days
CREATE OR REPLACE FUNCTION public.expire_stale_friend_requests()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  UPDATE public.user_friends
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending'
    AND created_at < now() - interval '30 days';
$$;

REVOKE ALL ON FUNCTION public.expire_stale_friend_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.expire_stale_friend_requests() TO authenticated;

-- Nightly cron at 03:10 to expire stale friend requests
SELECT cron.schedule(
  'daily-expire-friends',
  '10 3 * * *',
  $$SELECT public.expire_stale_friend_requests();$$
);