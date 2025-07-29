-- Create user XP log table
CREATE TABLE public.workout_xp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  routine_id UUID,
  performance_score NUMERIC,
  base_xp INTEGER NOT NULL DEFAULT 0,
  bonus_xp INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  reason TEXT, -- e.g. "Completed Workout", "7-Day Streak", etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user level table
CREATE TABLE public.user_levels (
  user_id UUID PRIMARY KEY,
  level INTEGER NOT NULL DEFAULT 1,
  current_xp INTEGER NOT NULL DEFAULT 0,
  xp_to_next_level INTEGER NOT NULL DEFAULT 100,
  last_leveled_up_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.workout_xp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their XP logs" ON public.workout_xp_logs
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their level" ON public.user_levels
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- XP gain function
CREATE OR REPLACE FUNCTION public.add_workout_xp(
  p_user_id UUID,
  p_routine_id UUID,
  p_score NUMERIC,
  p_reason TEXT DEFAULT 'Completed Workout'
) RETURNS VOID AS $$
DECLARE
  base_xp INTEGER := FLOOR(p_score);
  bonus_xp INTEGER := CASE 
    WHEN p_score >= 90 THEN 20
    WHEN p_score >= 75 THEN 10
    ELSE 0
  END;
  total INTEGER := base_xp + bonus_xp;
  new_total_xp INTEGER;
  xp_needed INTEGER;
  new_level INTEGER;
BEGIN
  -- Insert XP log
  INSERT INTO public.workout_xp_logs (user_id, routine_id, performance_score, base_xp, bonus_xp, total_xp, reason)
  VALUES (p_user_id, p_routine_id, p_score, base_xp, bonus_xp, total, p_reason);

  -- Update or insert level
  INSERT INTO public.user_levels (user_id, current_xp, xp_to_next_level)
  VALUES (p_user_id, total, 100)
  ON CONFLICT (user_id) DO UPDATE
  SET current_xp = user_levels.current_xp + total;

  -- Handle level-up logic
  SELECT current_xp, xp_to_next_level INTO new_total_xp, xp_needed FROM public.user_levels WHERE user_id = p_user_id;

  WHILE new_total_xp >= xp_needed LOOP
    new_total_xp := new_total_xp - xp_needed;
    new_level := (SELECT level FROM public.user_levels WHERE user_id = p_user_id) + 1;
    xp_needed := new_level * 100;

    UPDATE public.user_levels
    SET level = new_level,
        current_xp = new_total_xp,
        xp_to_next_level = xp_needed,
        last_leveled_up_at = now()
    WHERE user_id = p_user_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;