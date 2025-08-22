-- Create voice action data tables with RLS (simplified)
-- Hydration logs
CREATE TABLE IF NOT EXISTS public.hydration_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_ml integer not null check (amount_ml > 0 and amount_ml <= 10000),
  created_at timestamptz not null default now()
);
ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hyd_sel ON public.hydration_logs;
CREATE POLICY hyd_sel ON public.hydration_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS hyd_ins ON public.hydration_logs;
CREATE POLICY hyd_ins ON public.hydration_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Meal logs (quick-add)
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notes text not null,
  created_at timestamptz not null default now()
);
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS meal_sel ON public.meal_logs;
CREATE POLICY meal_sel ON public.meal_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS meal_ins ON public.meal_logs;
CREATE POLICY meal_ins ON public.meal_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Workout logs (quick-add)
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  summary text not null,
  created_at timestamptz not null default now()
);
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wkt_sel ON public.workout_logs;
CREATE POLICY wkt_sel ON public.workout_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS wkt_ins ON public.workout_logs;
CREATE POLICY wkt_ins ON public.workout_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- User goals
CREATE TABLE IF NOT EXISTS public.user_goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (name in ('protein','calories','steps','water_ml')),
  value numeric not null check (value > 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, name)
);
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_goals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS goal_sel ON public.user_goals;
CREATE POLICY goal_sel ON public.user_goals FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS goal_up ON public.user_goals;
CREATE POLICY goal_up ON public.user_goals FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Grants and indexes
REVOKE ALL ON public.hydration_logs, public.meal_logs, public.workout_logs, public.user_goals FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.hydration_logs, public.meal_logs, public.workout_logs, public.user_goals TO authenticated;
GRANT INSERT ON public.hydration_logs, public.meal_logs, public.workout_logs TO authenticated;
GRANT INSERT, UPDATE ON public.user_goals TO authenticated;

CREATE INDEX IF NOT EXISTS idx_hydration_user_at ON public.hydration_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meal_user_at ON public.meal_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_user_at ON public.workout_logs (user_id, created_at DESC);