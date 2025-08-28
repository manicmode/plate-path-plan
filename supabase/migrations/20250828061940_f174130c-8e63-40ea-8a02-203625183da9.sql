-- SAFE MIGRATION: nutrition_logs + RLS + indexes + trigger
BEGIN;

-- 0) Touch helper (idempotent)
CREATE OR REPLACE FUNCTION public.tg_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- 1) Create table if absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'nutrition_logs'
  ) THEN
    CREATE TABLE public.nutrition_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      food_name TEXT NOT NULL,
      calories INTEGER NOT NULL DEFAULT 0,
      protein NUMERIC NOT NULL DEFAULT 0,
      carbs NUMERIC NOT NULL DEFAULT 0,
      fat NUMERIC NOT NULL DEFAULT 0,
      fiber NUMERIC DEFAULT 0,
      sugar NUMERIC DEFAULT 0,
      sodium NUMERIC DEFAULT 0,
      saturated_fat NUMERIC DEFAULT 0,
      quality_score INTEGER DEFAULT 0,
      quality_verdict TEXT DEFAULT 'unknown',
      quality_reasons TEXT[],
      serving_size TEXT,
      source TEXT NOT NULL DEFAULT 'manual',
      image_url TEXT,
      processing_level TEXT,
      ingredient_analysis JSONB DEFAULT '{}'::jsonb,
      confidence NUMERIC DEFAULT 1.0,
      barcode TEXT,
      brand TEXT,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END$$;

-- 2) Ensure RLS is on
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

-- 3) Add any missing columns (no-op if already there)
DO $$
DECLARE
  cols JSONB := '[
    ["food_name","TEXT"],
    ["calories","INTEGER DEFAULT 0"],
    ["protein","NUMERIC DEFAULT 0"],
    ["carbs","NUMERIC DEFAULT 0"],
    ["fat","NUMERIC DEFAULT 0"],
    ["fiber","NUMERIC"],
    ["sugar","NUMERIC"],
    ["sodium","NUMERIC"],
    ["saturated_fat","NUMERIC"],
    ["quality_score","INTEGER"],
    ["quality_verdict","TEXT"],
    ["quality_reasons","TEXT[]"],
    ["serving_size","TEXT"],
    ["source","TEXT"],
    ["image_url","TEXT"],
    ["processing_level","TEXT"],
    ["ingredient_analysis","JSONB"],
    ["confidence","NUMERIC"],
    ["barcode","TEXT"],
    ["brand","TEXT"],
    ["created_at","timestamptz"],
    ["updated_at","timestamptz"]
  ]'::jsonb;
  c JSONB;
  colname TEXT;
  coldef  TEXT;
BEGIN
  FOR c IN SELECT * FROM jsonb_array_elements(cols)
  LOOP
    colname := (c->>0);
    coldef  := (c->>1);
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='nutrition_logs' AND column_name=colname
    ) THEN
      EXECUTE format('ALTER TABLE public.nutrition_logs ADD COLUMN %I %s;', colname, coldef);
    END IF;
  END LOOP;
END$$;

-- 4) Policies (create if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='nutrition_logs'
      AND policyname='nutrition_logs_select_own'
  ) THEN
    CREATE POLICY nutrition_logs_select_own
      ON public.nutrition_logs
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='nutrition_logs'
      AND policyname='nutrition_logs_insert_own'
  ) THEN
    CREATE POLICY nutrition_logs_insert_own
      ON public.nutrition_logs
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='nutrition_logs'
      AND policyname='nutrition_logs_update_own'
  ) THEN
    CREATE POLICY nutrition_logs_update_own
      ON public.nutrition_logs
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='nutrition_logs'
      AND policyname='nutrition_logs_delete_own'
  ) THEN
    CREATE POLICY nutrition_logs_delete_own
      ON public.nutrition_logs
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END$$;

-- 5) Indexes (guarded)
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_created
  ON public.nutrition_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_barcode
  ON public.nutrition_logs(barcode) WHERE barcode IS NOT NULL;

-- 6) Trigger (drop/recreate to guarantee function binding)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname='update_nutrition_logs_updated_at'
  ) THEN
    DROP TRIGGER update_nutrition_logs_updated_at ON public.nutrition_logs;
  END IF;
  CREATE TRIGGER update_nutrition_logs_updated_at
  BEFORE UPDATE ON public.nutrition_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_touch_updated_at();
END$$;

COMMIT;