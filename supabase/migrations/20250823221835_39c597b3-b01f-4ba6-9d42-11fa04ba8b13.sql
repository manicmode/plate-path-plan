-- Ensure core columns exist (add + defaults, then tighten)
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS timezone   text,
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS channel    text,
  ADD COLUMN IF NOT EXISTS payload    jsonb,
  ADD COLUMN IF NOT EXISTS is_active  boolean;

UPDATE public.reminders SET timezone = 'UTC' WHERE timezone IS NULL;
ALTER TABLE public.reminders ALTER COLUMN timezone SET NOT NULL;
ALTER TABLE public.reminders ALTER COLUMN timezone SET DEFAULT 'UTC';

UPDATE public.reminders SET channel = 'app' WHERE channel IS NULL;
ALTER TABLE public.reminders ALTER COLUMN channel SET NOT NULL;
ALTER TABLE public.reminders ALTER COLUMN channel SET DEFAULT 'app';

UPDATE public.reminders SET payload = '{}'::jsonb WHERE payload IS NULL;
ALTER TABLE public.reminders ALTER COLUMN payload SET NOT NULL;
ALTER TABLE public.reminders ALTER COLUMN payload SET DEFAULT '{}'::jsonb;

DO $$
BEGIN
  -- Prefer is_active; mirror from legacy 'active' if present
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reminders' AND column_name='is_active'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='reminders' AND column_name='active'
    ) THEN
      ALTER TABLE public.reminders ADD COLUMN is_active boolean;
      EXECUTE 'UPDATE public.reminders SET is_active = active WHERE is_active IS NULL';
      ALTER TABLE public.reminders ALTER COLUMN is_active SET NOT NULL;
    ELSE
      ALTER TABLE public.reminders ADD COLUMN is_active boolean NOT NULL DEFAULT true;
    END IF;
  END IF;
END $$;

-- Only tighten legacy columns if they actually exist (and are already non-null)
DO $$
DECLARE n int;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='reminders' AND column_name='label') THEN
    EXECUTE 'SELECT COUNT(*) FROM public.reminders WHERE label IS NULL' INTO n;
    IF n = 0 THEN EXECUTE 'ALTER TABLE public.reminders ALTER COLUMN label SET NOT NULL'; END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='reminders' AND column_name='frequency_type') THEN
    EXECUTE 'SELECT COUNT(*) FROM public.reminders WHERE frequency_type IS NULL' INTO n;
    IF n = 0 THEN EXECUTE 'ALTER TABLE public.reminders ALTER COLUMN frequency_type SET NOT NULL'; END IF;
  END IF;
END $$;

-- RLS (idempotent)
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  BEGIN
    CREATE POLICY reminders_rw ON public.reminders
      FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Scheduler index (choose the active column that exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='reminders' AND column_name='is_active') THEN
    CREATE INDEX IF NOT EXISTS reminders_user_next
      ON public.reminders(user_id, is_active, next_run_at);
    UPDATE public.reminders SET next_run_at = COALESCE(next_run_at, now())
     WHERE is_active = true AND next_run_at IS NULL;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='reminders' AND column_name='active') THEN
    CREATE INDEX IF NOT EXISTS reminders_user_next_active
      ON public.reminders(user_id, active, next_run_at);
    UPDATE public.reminders SET next_run_at = COALESCE(next_run_at, now())
     WHERE active = true AND next_run_at IS NULL;
  END IF;
END $$;