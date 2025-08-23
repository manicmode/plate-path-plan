-- Security hardening: lock search_path to pg_catalog to prevent function shadowing
CREATE OR REPLACE FUNCTION public.normalize_schedule()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
DECLARE
  norm text;
BEGIN
  norm := upper(btrim(regexp_replace(NEW.schedule, '^\s*RRULE:\s*', '')));
  IF NEW.schedule IS DISTINCT FROM norm THEN
    NEW.schedule := norm;
  END IF;
  RETURN NEW;
END $$;

-- Document the security measure
COMMENT ON FUNCTION public.normalize_schedule() IS
  'Normalizes reminders.schedule; search_path locked to pg_catalog for security.';