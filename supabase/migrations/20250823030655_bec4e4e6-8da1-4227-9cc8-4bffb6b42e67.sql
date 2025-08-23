BEGIN;

-- 1) Column + trigger setup (with null guard)
ALTER TABLE public.hydration_logs
  ADD COLUMN IF NOT EXISTS minute_key bigint;

CREATE OR REPLACE FUNCTION calculate_minute_key(ts timestamptz)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
AS $$ SELECT (EXTRACT(epoch FROM ts)::bigint / 60) $$;

CREATE OR REPLACE FUNCTION set_hydration_minute_key()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at := now();
  END IF;
  NEW.minute_key := calculate_minute_key(NEW.created_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hydration_set_minute_key ON public.hydration_logs;
CREATE TRIGGER hydration_set_minute_key
  BEFORE INSERT OR UPDATE ON public.hydration_logs
  FOR EACH ROW
  EXECUTE FUNCTION set_hydration_minute_key();

-- 2) Backfill minute_key
UPDATE public.hydration_logs
SET minute_key = calculate_minute_key(created_at)
WHERE minute_key IS NULL;

-- 3) Pre-clean duplicates that would block the unique index
WITH d AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, calculate_minute_key(created_at), volume
           ORDER BY created_at DESC
         ) AS rn
  FROM public.hydration_logs
  -- If volume can be NULL in legacy rows, exclude them from dedupe:
  WHERE volume IS NOT NULL
)
DELETE FROM public.hydration_logs h
USING d
WHERE h.id = d.id AND d.rn > 1;

-- 4) Create the unique index (non-concurrent; brief lock)
CREATE UNIQUE INDEX IF NOT EXISTS hydration_dedupe_minute
  ON public.hydration_logs (user_id, minute_key, volume);

COMMIT;