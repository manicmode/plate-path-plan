-- Enhanced AI Workout Routine Generation System
-- This migration enhances the existing ai_routines table with new fields needed for advanced routine generation

-- Add new columns to ai_routines table for enhanced functionality
ALTER TABLE public.ai_routines 
ADD COLUMN IF NOT EXISTS weekly_routine_data jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS muscle_group_schedule jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS generation_metadata jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS version_number integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS parent_routine_id uuid REFERENCES public.ai_routines(id),
ADD COLUMN IF NOT EXISTS total_weeks integer DEFAULT 8;

-- Create routine generation history table
CREATE TABLE IF NOT EXISTS public.routine_generation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  routine_id uuid REFERENCES public.ai_routines(id),
  generation_type text NOT NULL CHECK (generation_type IN ('initial', 'regenerate_day', 'regenerate_week', 'complete_regenerate')),
  day_regenerated text,
  week_regenerated integer,
  generation_request jsonb DEFAULT '{}',
  generation_response jsonb DEFAULT '{}',
  success boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on routine generation history
ALTER TABLE public.routine_generation_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for routine generation history
CREATE POLICY "Users can view their own generation history"
  ON public.routine_generation_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own generation history"
  ON public.routine_generation_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create workout routines table for individual workout sessions
CREATE TABLE IF NOT EXISTS public.workout_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ai_routine_id uuid REFERENCES public.ai_routines(id),
  day_of_week text NOT NULL CHECK (day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  week_number integer NOT NULL DEFAULT 1,
  workout_type text,
  target_muscles text[] DEFAULT '{}',
  estimated_duration integer,
  difficulty_level text DEFAULT 'intermediate',
  exercises jsonb DEFAULT '[]',
  rest_periods jsonb DEFAULT '{}',
  progression_notes text,
  is_locked boolean DEFAULT false,
  completion_status text DEFAULT 'pending' CHECK (completion_status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_at timestamp with time zone,
  performance_notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on workout routines
ALTER TABLE public.workout_routines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workout routines
CREATE POLICY "Users can view their own workout routines"
  ON public.workout_routines
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workout routines"
  ON public.workout_routines
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout routines"
  ON public.workout_routines
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout routines"
  ON public.workout_routines
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger for workout_routines
CREATE TRIGGER update_workout_routines_updated_at
  BEFORE UPDATE ON public.workout_routines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();