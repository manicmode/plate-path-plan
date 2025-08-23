-- Reminders: add channel & payload, keep schedule as TEXT, and index/bootstrap the scheduler
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS reminders_user_next
  ON public.reminders(user_id, is_active, next_run_at);

UPDATE public.reminders
   SET next_run_at = COALESCE(next_run_at, now())
 WHERE is_active = true;

-- Reminder run auditing (needed by workers & troubleshooting)
CREATE TABLE IF NOT EXISTS public.reminder_runs (
  id bigserial PRIMARY KEY,
  reminder_id uuid NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  scheduled_for timestamptz NOT NULL,
  delivered boolean NOT NULL DEFAULT false,
  delivered_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reminder_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN
    CREATE POLICY reminder_runs_rw ON public.reminder_runs
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

CREATE INDEX IF NOT EXISTS reminder_runs_user_time
  ON public.reminder_runs(user_id, scheduled_for);

-- Voice audit: make correlation unique per-user and keep success/error fields for flexible idempotency
ALTER TABLE public.voice_action_audit
  ADD COLUMN IF NOT EXISTS succeeded boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS error_message text;

DROP INDEX IF EXISTS voice_action_audit_correlation_unique;
CREATE UNIQUE INDEX IF NOT EXISTS voice_action_audit_correlation_unique
  ON public.voice_action_audit(user_id, correlation_id);

-- Performance: add the common query-path indexes for logs
CREATE INDEX IF NOT EXISTS hydration_logs_user_minute
  ON public.hydration_logs(user_id, minute_key DESC);
CREATE INDEX IF NOT EXISTS food_logs_user_minute
  ON public.food_logs(user_id, minute_key DESC);
CREATE INDEX IF NOT EXISTS supplement_logs_user_minute
  ON public.supplement_logs(user_id, minute_key DESC);

-- Consistent updated_at on logs (optional but recommended)
ALTER TABLE public.hydration_logs  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.food_logs       ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.supplement_logs ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$BEGIN NEW.updated_at := now(); RETURN NEW; END$$;

DROP TRIGGER IF EXISTS hydration_logs_touch_updated_at  ON public.hydration_logs;
CREATE TRIGGER hydration_logs_touch_updated_at  BEFORE UPDATE ON public.hydration_logs  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS food_logs_touch_updated_at       ON public.food_logs;
CREATE TRIGGER food_logs_touch_updated_at       BEFORE UPDATE ON public.food_logs       FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS supplement_logs_touch_updated_at ON public.supplement_logs;
CREATE TRIGGER supplement_logs_touch_updated_at BEFORE UPDATE ON public.supplement_logs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();