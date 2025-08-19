BEGIN;

-- 1) Nudge fallback table (only if push not wired)
CREATE TABLE IF NOT EXISTS public.habit_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  habit_slug text NOT NULL,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  channel text DEFAULT 'fallback', -- 'push' | 'fallback'
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_habit_nudges_user_scheduled 
ON public.habit_nudges(user_id, scheduled_for);

-- RLS optional; service-only writes from edge are fine. If enabling RLS later, add service_role policy.

-- 2) SQL shim (service-only) to trigger dispatch from jobs (optional)
CREATE OR REPLACE FUNCTION public.rpc_dispatch_habit_reminders()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  res jsonb := '{"ok": true}'::jsonb;
BEGIN
  -- Placeholder; real work happens in Edge Function.
  RETURN res || jsonb_build_object('ts', now());
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_dispatch_habit_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_dispatch_habit_reminders() TO service_role;

COMMENT ON TABLE public.habit_nudges IS 'Fallback storage for habit reminders when push notifications unavailable';
COMMENT ON FUNCTION public.rpc_dispatch_habit_reminders() IS 'Service-only shim to trigger habit reminder dispatch from scheduled jobs';

COMMIT;