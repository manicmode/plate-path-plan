-- Stronger, RRULE-aware format check (idempotent & guarded)
ALTER TABLE public.reminders DROP CONSTRAINT IF EXISTS schedule_rrule_format;
ALTER TABLE public.reminders
  ADD CONSTRAINT schedule_rrule_format
  CHECK (position('FREQ=' in upper(btrim(coalesce(schedule,'')))) = 1) NOT VALID;

DO $$
DECLARE v int;
BEGIN
  SELECT COUNT(*) INTO v
  FROM public.reminders
  WHERE schedule IS NOT NULL
    AND position('FREQ=' in upper(btrim(schedule))) <> 1;
  IF v = 0 THEN
    EXECUTE 'ALTER TABLE public.reminders VALIDATE CONSTRAINT schedule_rrule_format';
  END IF;
END $$;

-- Ensure the normalizer only runs when schedule changes
DROP TRIGGER IF EXISTS reminders_normalize_schedule ON public.reminders;
CREATE TRIGGER reminders_normalize_schedule
  BEFORE INSERT OR UPDATE OF schedule ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.normalize_schedule();