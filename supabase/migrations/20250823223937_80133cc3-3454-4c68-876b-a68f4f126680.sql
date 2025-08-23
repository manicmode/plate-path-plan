-- One-time cleanup: strip optional leading "RRULE:" and normalize existing data
UPDATE public.reminders
SET schedule = upper(btrim(regexp_replace(schedule, '^\s*RRULE:\s*', '')))
WHERE schedule ~* '^\s*RRULE:';

-- NULL-safe not-blank constraint to handle mixed environments
ALTER TABLE public.reminders DROP CONSTRAINT IF EXISTS schedule_not_blank;
ALTER TABLE public.reminders
  ADD CONSTRAINT schedule_not_blank
  CHECK (btrim(coalesce(schedule,'')) <> '') NOT VALID;
ALTER TABLE public.reminders VALIDATE CONSTRAINT schedule_not_blank;

-- RRULE format validation (requires FREQ= at start)
ALTER TABLE public.reminders DROP CONSTRAINT IF EXISTS schedule_rrule_format;
ALTER TABLE public.reminders
  ADD CONSTRAINT schedule_rrule_format
  CHECK (position('FREQ=' in upper(btrim(coalesce(schedule,'')))) = 1);

-- Enhanced normalizer that strips RRULE: prefix and normalizes
CREATE OR REPLACE FUNCTION public.normalize_schedule()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  norm text;
BEGIN
  norm := upper(btrim(regexp_replace(NEW.schedule, '^\s*RRULE:\s*', '')));
  IF NEW.schedule IS DISTINCT FROM norm THEN
    NEW.schedule := norm;
  END IF;
  RETURN NEW;
END $$;

-- Optimized trigger - only fires on schedule column changes
DROP TRIGGER IF EXISTS reminders_normalize_schedule ON public.reminders;
CREATE TRIGGER reminders_normalize_schedule
  BEFORE INSERT OR UPDATE OF schedule ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.normalize_schedule();