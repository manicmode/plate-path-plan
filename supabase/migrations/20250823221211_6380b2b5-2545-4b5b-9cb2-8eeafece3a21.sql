-- First ensure all required columns exist before creating indexes or guards
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'app',
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz;

-- Guard 1: voice_action_audit.correlation_id (add/backfill/enforce NOT NULL)
DO $$ BEGIN
  -- First check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='voice_action_audit') THEN
    -- Add columns if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='voice_action_audit' AND column_name='correlation_id'
    ) THEN
      ALTER TABLE public.voice_action_audit ADD COLUMN correlation_id text;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='voice_action_audit' AND column_name='succeeded'
    ) THEN
      ALTER TABLE public.voice_action_audit ADD COLUMN succeeded boolean NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='voice_action_audit' AND column_name='error_message'
    ) THEN
      ALTER TABLE public.voice_action_audit ADD COLUMN error_message text;
    END IF;

    -- Backfill any NULLs (use primary key text to keep uniqueness for legacy rows)
    UPDATE public.voice_action_audit
       SET correlation_id = COALESCE(correlation_id, id::text)
     WHERE correlation_id IS NULL;

    ALTER TABLE public.voice_action_audit ALTER COLUMN correlation_id SET NOT NULL;
  END IF;
END $$;

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

-- Now create indexes and bootstrap after all columns exist
CREATE INDEX IF NOT EXISTS reminders_user_next
  ON public.reminders(user_id, is_active, next_run_at);

UPDATE public.reminders
   SET next_run_at = COALESCE(next_run_at, now())
 WHERE is_active = true;

-- Create voice audit unique index (idempotent)
DROP INDEX IF EXISTS voice_action_audit_correlation_unique;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='voice_action_audit') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS voice_action_audit_correlation_unique
      ON public.voice_action_audit(user_id, correlation_id);
  END IF;
END $$;