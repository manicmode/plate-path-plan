-- HYDRATION SCHEMA NORMALIZATION (safe/idempotent)

BEGIN;

-- 1) Ensure columns exist
ALTER TABLE public.hydration_logs
  ADD COLUMN IF NOT EXISTS volume integer,
  ADD COLUMN IF NOT EXISTS type   text,
  ADD COLUMN IF NOT EXISTS name   text;

-- 2) Backfill from legacy amount_ml -> volume (if that column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='hydration_logs' AND column_name='amount_ml'
  ) THEN
    UPDATE public.hydration_logs
      SET volume = amount_ml
    WHERE volume IS NULL AND amount_ml IS NOT NULL;
  END IF;
END$$;

-- 3) Fill sensible defaults where missing
ALTER TABLE public.hydration_logs
  ALTER COLUMN type SET DEFAULT 'water';

UPDATE public.hydration_logs
  SET type = 'water'
WHERE type IS NULL;

UPDATE public.hydration_logs
  SET name = CONCAT(volume::text, ' ml Water')
WHERE name IS NULL AND volume IS NOT NULL;

-- 4) Enforce valid ranges (but allow NULL while backfilling)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='hydration_volume_chk') THEN
    ALTER TABLE public.hydration_logs
      ADD CONSTRAINT hydration_volume_chk
      CHECK (volume IS NULL OR (volume > 0 AND volume <= 10000));
  END IF;
END$$;

-- 5) Only set NOT NULL when the table is clean (prevents migration failures)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.hydration_logs WHERE volume IS NULL) THEN
    ALTER TABLE public.hydration_logs ALTER COLUMN volume SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.hydration_logs WHERE type IS NULL) THEN
    ALTER TABLE public.hydration_logs ALTER COLUMN type   SET NOT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.hydration_logs WHERE name IS NULL) THEN
    ALTER TABLE public.hydration_logs ALTER COLUMN name   SET NOT NULL;
  END IF;
END$$;

-- 6) Idempotency: avoid duplicate entries within the same minute
CREATE UNIQUE INDEX IF NOT EXISTS hydration_unique_minute
  ON public.hydration_logs (user_id, (date_trunc('minute', created_at)), volume);

COMMIT;