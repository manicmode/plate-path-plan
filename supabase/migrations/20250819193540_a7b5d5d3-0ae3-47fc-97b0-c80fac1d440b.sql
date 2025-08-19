BEGIN;

-- Enhance habit_template table (safe additions)
DO $$
BEGIN
  -- Add is_active column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='habit_template' AND column_name='is_active'
  ) THEN
    ALTER TABLE public.habit_template ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Enhance user_habit table
DO $$
BEGIN
  -- Add target_per_week column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='user_habit' AND column_name='target_per_week'
  ) THEN
    ALTER TABLE public.user_habit ADD COLUMN target_per_week int NOT NULL DEFAULT 5;
  END IF;
  
  -- Add is_paused column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='user_habit' AND column_name='is_paused'
  ) THEN
    ALTER TABLE public.user_habit ADD COLUMN is_paused boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add target_per_week constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name='user_habit_target_per_week_check'
  ) THEN
    ALTER TABLE public.user_habit 
    ADD CONSTRAINT user_habit_target_per_week_check 
    CHECK (target_per_week BETWEEN 1 AND 7);
  END IF;
END $$;

-- Create habit_reminders table if missing (using slug reference like user_habit)
CREATE TABLE IF NOT EXISTS public.habit_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  habit_slug text NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily','weekly','custom')),
  time_local time,
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_habit_reminders_user ON public.habit_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_reminders_slug ON public.habit_reminders(habit_slug);
CREATE INDEX IF NOT EXISTS idx_user_habit_user ON public.user_habit(user_id);
CREATE INDEX IF NOT EXISTS idx_user_habit_slug ON public.user_habit(slug);

-- Enable RLS on habit_reminders
ALTER TABLE public.habit_reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for habit_reminders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname='public' AND tablename='habit_reminders' AND policyname='p_habit_reminders_rw'
  ) THEN
    CREATE POLICY p_habit_reminders_rw ON public.habit_reminders
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Hardening constraints
-- 1) One reminder per user per habit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='uniq_habit_reminders_user_slug'
  ) THEN
    ALTER TABLE public.habit_reminders
    ADD CONSTRAINT uniq_habit_reminders_user_slug
    UNIQUE (user_id, habit_slug);
  END IF;
END $$;

-- 2) Enforce user's single enrollment per habit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='uniq_user_habit_user_slug'
  ) THEN
    ALTER TABLE public.user_habit
    ADD CONSTRAINT uniq_user_habit_user_slug
    UNIQUE (user_id, slug);
  END IF;
END $$;

-- 3) Tie reminders to templates via slug (FK)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema='public' AND table_name='habit_reminders'
      AND constraint_name='fk_habit_reminders_slug'
  ) THEN
    ALTER TABLE public.habit_reminders
    ADD CONSTRAINT fk_habit_reminders_slug
    FOREIGN KEY (habit_slug) REFERENCES public.habit_template(slug) ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;