-- Guard 1: voice_action_audit.correlation_id (add/backfill/enforce NOT NULL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='voice_action_audit' AND column_name='correlation_id'
  ) THEN
    ALTER TABLE public.voice_action_audit ADD COLUMN correlation_id text;
  END IF;

  -- Backfill any NULLs (use primary key text to keep uniqueness for legacy rows)
  UPDATE public.voice_action_audit
     SET correlation_id = COALESCE(correlation_id, id::text)
   WHERE correlation_id IS NULL;

  ALTER TABLE public.voice_action_audit ALTER COLUMN correlation_id SET NOT NULL;
END $$;

-- Recreate the unique index (idempotent)
DROP INDEX IF EXISTS voice_action_audit_correlation_unique;
CREATE UNIQUE INDEX IF NOT EXISTS voice_action_audit_correlation_unique
  ON public.voice_action_audit(user_id, correlation_id);

-- Guard 2: reminders 'active' vs 'is_active' + schedule type
DO $$ BEGIN
  -- If only 'active' exists, mirror into 'is_active'
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reminders' AND column_name='active'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reminders' AND column_name='is_active'
  ) THEN
    ALTER TABLE public.reminders ADD COLUMN is_active boolean;
    UPDATE public.reminders SET is_active = active WHERE is_active IS NULL;
    ALTER TABLE public.reminders ALTER COLUMN is_active SET NOT NULL;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reminders' AND column_name='is_active'
  ) THEN
    -- Neither column present: create is_active as default true
    ALTER TABLE public.reminders ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;

  -- Ensure schedule is TEXT (older envs had jsonb)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reminders' AND column_name='schedule' AND data_type='jsonb'
  ) THEN
    ALTER TABLE public.reminders
      ALTER COLUMN schedule TYPE text USING trim(both '"' from schedule::text);
  END IF;
END $$;

-- Use whichever activity column exists for index/bootstrap
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='reminders' AND column_name='is_active'
  ) THEN
    CREATE INDEX IF NOT EXISTS reminders_user_next
      ON public.reminders(user_id, is_active, next_run_at);
    UPDATE public.reminders SET next_run_at = COALESCE(next_run_at, now())
     WHERE is_active = true;
  ELSE
    CREATE INDEX IF NOT EXISTS reminders_user_next
      ON public.reminders(user_id, active, next_run_at);
    UPDATE public.reminders SET next_run_at = COALESCE(next_run_at, now())
     WHERE active = true;
  END IF;
END $$;