CREATE OR REPLACE FUNCTION public.nutrition_logs_set_user()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS tg_nutrition_logs_set_user ON public.nutrition_logs;
CREATE TRIGGER tg_nutrition_logs_set_user
BEFORE INSERT ON public.nutrition_logs
FOR EACH ROW EXECUTE FUNCTION public.nutrition_logs_set_user();