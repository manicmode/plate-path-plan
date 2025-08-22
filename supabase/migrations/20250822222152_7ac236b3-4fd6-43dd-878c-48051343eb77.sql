-- Add idempotent UPDATE/DELETE policies and updated_at trigger
DROP POLICY IF EXISTS hyd_upd ON public.hydration_logs;
DROP POLICY IF EXISTS hyd_del ON public.hydration_logs;
DROP POLICY IF EXISTS meal_upd ON public.meal_logs;
DROP POLICY IF EXISTS meal_del ON public.meal_logs;
DROP POLICY IF EXISTS wkt_upd ON public.workout_logs;
DROP POLICY IF EXISTS wkt_del ON public.workout_logs;

CREATE POLICY hyd_upd ON public.hydration_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY hyd_del ON public.hydration_logs FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY meal_upd ON public.meal_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY meal_del ON public.meal_logs FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY wkt_upd ON public.workout_logs FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY wkt_del ON public.workout_logs FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Keep user_goals.updated_at fresh on write
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_user_goals_updated_at ON public.user_goals;
CREATE TRIGGER trg_user_goals_updated_at
BEFORE UPDATE ON public.user_goals
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();