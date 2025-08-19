BEGIN;

-- Enhance habit_template table (safe additions)
DO $$
BEGIN
  -- Add domain column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='habit_template' AND column_name='domain'
  ) THEN
    ALTER TABLE public.habit_template ADD COLUMN domain text;
  END IF;
  
  -- Add difficulty column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='habit_template' AND column_name='difficulty'
  ) THEN
    ALTER TABLE public.habit_template ADD COLUMN difficulty text;
  END IF;
  
  -- Add category column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='habit_template' AND column_name='category'
  ) THEN
    ALTER TABLE public.habit_template ADD COLUMN category text;
  END IF;
  
  -- Add is_active column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='habit_template' AND column_name='is_active'
  ) THEN
    ALTER TABLE public.habit_template ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Add constraints (safe with NULLs)
DO $$
BEGIN
  -- Domain constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name='habit_template_domain_check'
  ) THEN
    ALTER TABLE public.habit_template 
    ADD CONSTRAINT habit_template_domain_check 
    CHECK (domain IS NULL OR domain IN ('nutrition','exercise','recovery','lifestyle'));
  END IF;
  
  -- Difficulty constraint  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name='habit_template_difficulty_check'
  ) THEN
    ALTER TABLE public.habit_template 
    ADD CONSTRAINT habit_template_difficulty_check 
    CHECK (difficulty IS NULL OR difficulty IN ('easy','medium','hard'));
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

-- Create habit_reminders table if missing
CREATE TABLE IF NOT EXISTS public.habit_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('daily','weekly','custom')),
  time_local time,
  day_of_week int CHECK (day_of_week BETWEEN 0 AND 6),
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_habit_reminders_user ON public.habit_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_user_habit_user ON public.user_habit(user_id);
CREATE INDEX IF NOT EXISTS idx_user_habit_template ON public.user_habit(template_id);

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

-- Update existing templates with default values (safe)
UPDATE public.habit_template 
SET 
  domain = CASE 
    WHEN slug LIKE '%nutrition%' OR slug LIKE '%food%' OR slug LIKE '%hydration%' THEN 'nutrition'
    WHEN slug LIKE '%exercise%' OR slug LIKE '%workout%' OR slug LIKE '%activity%' THEN 'exercise'
    WHEN slug LIKE '%recovery%' OR slug LIKE '%meditation%' OR slug LIKE '%sleep%' THEN 'recovery'
    ELSE 'lifestyle'
  END,
  difficulty = 'easy',
  category = 'general'
WHERE domain IS NULL;

COMMIT;