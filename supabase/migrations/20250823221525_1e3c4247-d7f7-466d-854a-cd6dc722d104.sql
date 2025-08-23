-- If the table doesn't exist, create it with the full shape
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  schedule text NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  is_active boolean NOT NULL DEFAULT true,
  next_run_at timestamptz,
  channel text NOT NULL DEFAULT 'app',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- If the table already existed, add missing columns/NOT NULLs idempotently
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS channel  text  NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS payload  jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz,
  ALTER COLUMN schedule SET NOT NULL,
  ALTER COLUMN timezone SET NOT NULL;

-- RLS + owner policy (safe if already present)
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN
    CREATE POLICY reminders_rw ON public.reminders
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Index + bootstrap for the scheduler
CREATE INDEX IF NOT EXISTS reminders_user_next
  ON public.reminders(user_id, is_active, next_run_at);

UPDATE public.reminders
   SET next_run_at = COALESCE(next_run_at, now())
 WHERE is_active = true;