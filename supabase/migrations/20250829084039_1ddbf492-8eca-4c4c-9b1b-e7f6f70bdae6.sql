-- 1) Function: set user_id from the current JWT (hardened)
CREATE OR REPLACE FUNCTION public.nutrition_logs_set_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END
$func$;

-- Ensure only the trigger can invoke it (no ad-hoc EXECUTE from PUBLIC)
REVOKE ALL ON FUNCTION public.nutrition_logs_set_user() FROM PUBLIC;

-- 2) Idempotent trigger creation
DROP TRIGGER IF EXISTS nutrition_logs_set_user_trigger ON public.nutrition_logs;

CREATE TRIGGER nutrition_logs_set_user_trigger
BEFORE INSERT ON public.nutrition_logs
FOR EACH ROW
EXECUTE FUNCTION public.nutrition_logs_set_user();

-- 3) RLS (safe if already enabled)
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

-- 4) Policies (create if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public'
      AND tablename='nutrition_logs'
      AND policyname='insert_own_nutrition_logs'
  ) THEN
    EXECUTE 'CREATE POLICY "insert_own_nutrition_logs"
      ON public.nutrition_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public'
      AND tablename='nutrition_logs'
      AND policyname='select_own_nutrition_logs'
  ) THEN
    EXECUTE 'CREATE POLICY "select_own_nutrition_logs"
      ON public.nutrition_logs
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid())';
  END IF;
END
$$;