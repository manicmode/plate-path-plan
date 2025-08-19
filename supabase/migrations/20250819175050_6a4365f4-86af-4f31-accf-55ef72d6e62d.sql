-- 1) Add FCM token storage to user_profiles
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS fcm_token text;

-- 2) Extend habit_nudges for delivery bookkeeping
ALTER TABLE public.habit_nudges
  ADD COLUMN IF NOT EXISTS error text,
  ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0;

-- 3) Helpful indexes for delivery performance
CREATE INDEX IF NOT EXISTS idx_habit_nudges_unsent
  ON public.habit_nudges (scheduled_date, scheduled_for)
  WHERE sent_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_fcm
  ON public.user_profiles (user_id, fcm_token)
  WHERE fcm_token IS NOT NULL;

-- 4) SQL RPC to claim rows atomically (service_role only)
CREATE OR REPLACE FUNCTION public.rpc_claim_nudges(p_limit int DEFAULT 100)
RETURNS TABLE (id uuid, user_id uuid, habit_slug text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH cte AS (
    SELECT n.id, n.user_id, n.habit_slug
    FROM public.habit_nudges n
    WHERE n.sent_at IS NULL
      AND n.scheduled_for <= now()
      AND n.attempts < 5
    ORDER BY n.scheduled_for ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  SELECT id, user_id, habit_slug FROM cte;
END;
$$;

-- 5) Helper functions for delivery tracking (service_role only)
CREATE OR REPLACE FUNCTION public.mark_nudge_sent(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.habit_nudges
  SET sent_at = now(),
      attempts = attempts + 1
  WHERE id = p_id;
$$;

CREATE OR REPLACE FUNCTION public.mark_nudge_error(p_id uuid, p_err text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.habit_nudges
  SET error = p_err,
      attempts = attempts + 1
  WHERE id = p_id;
$$;

-- 6) Secure the functions to service_role only
REVOKE ALL ON FUNCTION public.rpc_claim_nudges(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_nudge_sent(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_nudge_error(uuid, text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.rpc_claim_nudges(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_nudge_sent(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_nudge_error(uuid, text) TO service_role;