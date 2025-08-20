-- Fix table grants with environment safety guards
-- Critical fix: Previous GRANT statements didn't apply correctly

-- Grant permissions on specific tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.habit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_custom_habit TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nudge_event TO authenticated;

-- Cover all existing sequences (not just habit_reminders)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Make the user_achievement grant safe across environments
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='user_achievement'
  ) THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievement TO authenticated;
  END IF;
END$$;

-- Set default privileges for future objects (belt-and-suspenders)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Ensure schema access
GRANT USAGE ON SCHEMA public TO authenticated;