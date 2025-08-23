-- Optimize normalization function to avoid needless writes
CREATE OR REPLACE FUNCTION public.normalize_schedule()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  norm text;
BEGIN
  norm := upper(btrim(NEW.schedule));
  IF NEW.schedule IS DISTINCT FROM norm THEN
    NEW.schedule := norm;
  END IF;
  RETURN NEW;
END $$;

-- Only fire trigger when schedule column changes
DROP TRIGGER IF EXISTS reminders_normalize_schedule ON public.reminders;
CREATE TRIGGER reminders_normalize_schedule
  BEFORE INSERT OR UPDATE OF schedule ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.normalize_schedule();