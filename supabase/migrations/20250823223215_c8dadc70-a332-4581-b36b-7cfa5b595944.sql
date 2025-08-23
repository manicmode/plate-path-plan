-- Make the constraint idempotent (won't error if it already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'reminders'
      AND c.conname = 'schedule_not_blank'
  ) THEN
    ALTER TABLE public.reminders
      ADD CONSTRAINT schedule_not_blank CHECK (btrim(schedule) <> '');
  END IF;
END $$;

-- Add normalization trigger to keep schedules clean
CREATE OR REPLACE FUNCTION public.normalize_schedule()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.schedule := upper(btrim(NEW.schedule));
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS reminders_normalize_schedule ON public.reminders;
CREATE TRIGGER reminders_normalize_schedule
  BEFORE INSERT OR UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.normalize_schedule();