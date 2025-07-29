-- Fix security warnings by setting proper search_path for functions
-- Drop trigger first, then functions
DROP TRIGGER IF EXISTS trigger_update_performance_score ON public.workout_performance_logs;
DROP FUNCTION IF EXISTS public.update_performance_score();
DROP FUNCTION IF EXISTS public.calculate_performance_score(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, TEXT);

-- Recreate function with secure search_path
CREATE OR REPLACE FUNCTION public.calculate_performance_score(
  completed_sets INTEGER,
  total_sets INTEGER,
  completed_exercises INTEGER,
  total_exercises INTEGER,
  skipped_steps INTEGER,
  difficulty_rating TEXT
) RETURNS NUMERIC 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
DECLARE
  completion_score NUMERIC;
  difficulty_bonus NUMERIC;
  skip_penalty NUMERIC;
  final_score NUMERIC;
BEGIN
  -- Base completion score (0-70 points)
  completion_score := LEAST(70, (completed_sets::NUMERIC / NULLIF(total_sets, 0)) * 50 + 
                                (completed_exercises::NUMERIC / NULLIF(total_exercises, 0)) * 20);
  
  -- Difficulty bonus (0-20 points)
  difficulty_bonus := CASE 
    WHEN difficulty_rating = 'too_hard' THEN 20
    WHEN difficulty_rating = 'just_right' THEN 15
    WHEN difficulty_rating = 'too_easy' THEN 5
    ELSE 10
  END;
  
  -- Skip penalty (0-10 points deduction)
  skip_penalty := LEAST(10, skipped_steps * 2);
  
  -- Calculate final score (0-100)
  final_score := GREATEST(0, completion_score + difficulty_bonus - skip_penalty);
  
  RETURN ROUND(final_score, 1);
END;
$$;

-- Recreate trigger function with secure search_path
CREATE OR REPLACE FUNCTION public.update_performance_score()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
BEGIN
  NEW.performance_score := public.calculate_performance_score(
    NEW.completed_sets_count,
    NEW.total_sets_count,
    NEW.completed_exercises_count,
    NEW.total_exercises_count,
    NEW.skipped_steps_count,
    NEW.difficulty_rating
  );
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER trigger_update_performance_score
  BEFORE INSERT OR UPDATE ON public.workout_performance_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_performance_score();