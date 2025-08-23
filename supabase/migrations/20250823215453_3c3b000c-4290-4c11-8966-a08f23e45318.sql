-- Fixed migration with 3 tweaks for clean rollout

-- 0) Minute-key (floor to minute)
CREATE OR REPLACE FUNCTION public.calculate_minute_key(ts timestamptz)
RETURNS bigint LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT floor(extract(epoch from date_trunc('minute', ts)) / 60)::bigint
$$;

-- 1) Generic trigger: minute_key from created_at
CREATE OR REPLACE FUNCTION public.set_minute_key_from_created_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.created_at IS NULL THEN NEW.created_at := now(); END IF;
  IF NEW.minute_key IS NULL THEN
    NEW.minute_key := public.calculate_minute_key(NEW.created_at);
  END IF;
  RETURN NEW;
END$$;

-- 2) HYDRATION
CREATE TABLE IF NOT EXISTS public.hydration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  volume numeric,               -- in ounces; agent maps amount_oz→volume
  name text DEFAULT 'water',
  minute_key bigint,            -- nullable until trigger is set
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add minute_key column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='hydration_logs' AND column_name='minute_key'
  ) THEN
    ALTER TABLE public.hydration_logs ADD COLUMN minute_key bigint;
  END IF;
END $$;

DROP TRIGGER IF EXISTS hydration_logs_minute_key_trigger ON public.hydration_logs;
CREATE TRIGGER hydration_logs_minute_key_trigger
  BEFORE INSERT ON public.hydration_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_minute_key_from_created_at();

-- TWEAK 1: Guard null created_at in backfills
UPDATE public.hydration_logs
SET minute_key = public.calculate_minute_key(COALESCE(created_at, now()))
WHERE minute_key IS NULL;

ALTER TABLE public.hydration_logs ALTER COLUMN minute_key SET NOT NULL;

CREATE INDEX IF NOT EXISTS hydration_logs_user_minute
  ON public.hydration_logs(user_id, minute_key DESC);

-- TWEAK 3: Drop dedupe index to allow multiple identical entries
DROP INDEX IF EXISTS hydration_logs_dedupe;

-- 3) FOOD (align column names used by the loader)
CREATE TABLE IF NOT EXISTS public.food_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,           -- NOT food_name
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  minute_key bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add minute_key column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='food_logs' AND column_name='minute_key'
  ) THEN
    ALTER TABLE public.food_logs ADD COLUMN minute_key bigint;
  END IF;
END $$;

DROP TRIGGER IF EXISTS food_logs_minute_key_trigger ON public.food_logs;
CREATE TRIGGER food_logs_minute_key_trigger
  BEFORE INSERT ON public.food_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_minute_key_from_created_at();

-- TWEAK 1: Guard null created_at in backfills
UPDATE public.food_logs 
SET minute_key = public.calculate_minute_key(COALESCE(created_at, now())) 
WHERE minute_key IS NULL;

ALTER TABLE public.food_logs ALTER COLUMN minute_key SET NOT NULL;

CREATE INDEX IF NOT EXISTS food_logs_user_minute
  ON public.food_logs(user_id, minute_key DESC);

CREATE UNIQUE INDEX IF NOT EXISTS food_logs_dedupe
  ON public.food_logs(user_id, minute_key, name, COALESCE(calories,0));

-- 4) SUPPLEMENTS (align names & types)
CREATE TABLE IF NOT EXISTS public.supplement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  dose numeric,                 -- NOT dosage text, nullable initially
  unit text,                    -- nullable initially
  minute_key bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add missing columns if they don't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='supplement_logs' AND column_name='minute_key'
  ) THEN
    ALTER TABLE public.supplement_logs ADD COLUMN minute_key bigint;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='supplement_logs' AND column_name='dose'
  ) THEN
    ALTER TABLE public.supplement_logs ADD COLUMN dose numeric;
  END IF;
END $$;

-- Convert dosage to dose if dosage column exists
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='supplement_logs' AND column_name='dosage'
  ) THEN
    -- Try to convert text dosage to numeric dose
    UPDATE public.supplement_logs 
    SET dose = CASE 
      WHEN dosage ~ '^[0-9]+\.?[0-9]*$' THEN dosage::numeric
      ELSE NULL
    END
    WHERE dose IS NULL AND dosage IS NOT NULL;
  END IF;
END $$;

-- TWEAK 2: Ensure unit exists and fix NOT NULL safely
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='supplement_logs' AND column_name='unit'
  ) THEN
    ALTER TABLE public.supplement_logs ADD COLUMN unit text;
    UPDATE public.supplement_logs SET unit = 'pill' WHERE unit IS NULL;
    ALTER TABLE public.supplement_logs ALTER COLUMN unit SET NOT NULL;
  END IF;

  -- Make dose NOT NULL only if all rows have a value after converting dosage
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='supplement_logs' AND column_name='dose')
     AND (SELECT COUNT(*) FROM public.supplement_logs WHERE dose IS NULL) = 0 THEN
    ALTER TABLE public.supplement_logs ALTER COLUMN dose SET NOT NULL;
  END IF;
END $$;

DROP TRIGGER IF EXISTS supplement_logs_minute_key_trigger ON public.supplement_logs;
CREATE TRIGGER supplement_logs_minute_key_trigger
  BEFORE INSERT ON public.supplement_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_minute_key_from_created_at();

-- TWEAK 1: Guard null created_at in backfills
UPDATE public.supplement_logs
SET minute_key = public.calculate_minute_key(COALESCE(created_at, now()))
WHERE minute_key IS NULL;

ALTER TABLE public.supplement_logs ALTER COLUMN minute_key SET NOT NULL;

CREATE INDEX IF NOT EXISTS supplement_logs_user_minute
  ON public.supplement_logs(user_id, minute_key DESC);

CREATE UNIQUE INDEX IF NOT EXISTS supplement_logs_dedupe
  ON public.supplement_logs(user_id, minute_key, name, dose, unit);

-- 5) GOALS
CREATE TABLE IF NOT EXISTS public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  domain text NOT NULL,
  metric text NOT NULL,
  target numeric NOT NULL,
  unit text NOT NULL,
  timeframe text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS goals_active_unique
  ON public.goals(user_id, domain, metric, timeframe) WHERE active = true;

-- 6) REMINDERS (schedule is TEXT; add next_run_at cursor)
CREATE TABLE IF NOT EXISTS public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  schedule text NOT NULL,       -- RRULE TEXT
  timezone text NOT NULL,
  channel text NOT NULL DEFAULT 'app',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- convert old jsonb schedule if present
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='reminders'
                 AND column_name='schedule' AND data_type='jsonb') THEN
    ALTER TABLE public.reminders
      ALTER COLUMN schedule TYPE text USING trim(both '"' from schedule::text);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS reminders_user_next
  ON public.reminders(user_id, active, next_run_at);

-- 7) VOICE AUDIT (correlation_id must be TEXT)
CREATE TABLE IF NOT EXISTS public.voice_action_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  correlation_id text NOT NULL,       -- TEXT (not uuid)
  tool_name text NOT NULL,
  args jsonb NOT NULL DEFAULT '{}'::jsonb,
  succeeded boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, correlation_id)
);

-- 8) Touch-updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END$$;

DROP TRIGGER IF EXISTS hydration_logs_touch_updated_at ON public.hydration_logs;
CREATE TRIGGER hydration_logs_touch_updated_at
BEFORE UPDATE ON public.hydration_logs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS food_logs_touch_updated_at ON public.food_logs;
CREATE TRIGGER food_logs_touch_updated_at
BEFORE UPDATE ON public.food_logs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS supplement_logs_touch_updated_at ON public.supplement_logs;
CREATE TRIGGER supplement_logs_touch_updated_at
BEFORE UPDATE ON public.supplement_logs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS goals_touch_updated_at ON public.goals;
CREATE TRIGGER goals_touch_updated_at
BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS reminders_touch_updated_at ON public.reminders;
CREATE TRIGGER reminders_touch_updated_at
BEFORE UPDATE ON public.reminders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 9) RLS (owner read/write)
ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_action_audit ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- hydration
  BEGIN CREATE POLICY hydration_rw ON public.hydration_logs
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  -- food
  BEGIN CREATE POLICY food_rw ON public.food_logs
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  -- supplements
  BEGIN CREATE POLICY supplements_rw ON public.supplement_logs
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  -- goals
  BEGIN CREATE POLICY goals_rw ON public.goals
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  -- reminders
  BEGIN CREATE POLICY reminders_rw ON public.reminders
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  -- voice audit
  BEGIN CREATE POLICY voice_audit_rw ON public.voice_action_audit
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;