-- Create enhanced AI routines table for intelligent workout generation
CREATE TABLE IF NOT EXISTS public.ai_generated_routines (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  routine_name text NOT NULL,
  fitness_level text NOT NULL CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  split_type text NOT NULL CHECK (split_type IN ('full_body', 'upper_lower', 'push_pull_legs', 'body_part_split')),
  days_per_week integer NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  session_duration_minutes integer NOT NULL CHECK (session_duration_minutes BETWEEN 15 AND 180),
  equipment_available text[] NOT NULL DEFAULT '{}',
  primary_goals text[] NOT NULL DEFAULT '{}',
  weekly_routine_data jsonb NOT NULL DEFAULT '{}',
  muscle_group_schedule jsonb NOT NULL DEFAULT '{}',
  locked_days integer[] NOT NULL DEFAULT '{}',
  generation_metadata jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  version_number integer NOT NULL DEFAULT 1,
  parent_routine_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create routine generation history table
CREATE TABLE IF NOT EXISTS public.routine_generation_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  routine_id uuid NOT NULL REFERENCES public.ai_generated_routines(id) ON DELETE CASCADE,
  generation_type text NOT NULL CHECK (generation_type IN ('initial', 'regenerate_day', 'regenerate_week', 'manual_edit')),
  target_day integer,
  previous_routine_data jsonb,
  new_routine_data jsonb,
  generation_parameters jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create user fitness preferences table
CREATE TABLE IF NOT EXISTS public.user_fitness_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  fitness_level text NOT NULL DEFAULT 'beginner' CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
  preferred_split text NOT NULL DEFAULT 'full_body' CHECK (preferred_split IN ('full_body', 'upper_lower', 'push_pull_legs', 'body_part_split')),
  days_per_week integer NOT NULL DEFAULT 3 CHECK (days_per_week BETWEEN 1 AND 7),
  session_duration_minutes integer NOT NULL DEFAULT 45 CHECK (session_duration_minutes BETWEEN 15 AND 180),
  available_equipment text[] NOT NULL DEFAULT ARRAY['bodyweight'],
  primary_goals text[] NOT NULL DEFAULT ARRAY['general_fitness'],
  injury_considerations text[] NOT NULL DEFAULT '{}',
  preferred_workout_times text[] NOT NULL DEFAULT '{}',
  intensity_preference text NOT NULL DEFAULT 'moderate' CHECK (intensity_preference IN ('low', 'moderate', 'high')),
  rest_preferences jsonb NOT NULL DEFAULT '{"between_sets": 60, "between_exercises": 90}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ai_generated_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_generation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_fitness_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ai_generated_routines
CREATE POLICY "Users can create their own AI routines" 
ON public.ai_generated_routines 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own AI routines" 
ON public.ai_generated_routines 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI routines" 
ON public.ai_generated_routines 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own AI routines" 
ON public.ai_generated_routines 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for routine_generation_history
CREATE POLICY "Users can create their own routine history" 
ON public.routine_generation_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own routine history" 
ON public.routine_generation_history 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create RLS policies for user_fitness_preferences
CREATE POLICY "Users can create their own fitness preferences" 
ON public.user_fitness_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own fitness preferences" 
ON public.user_fitness_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own fitness preferences" 
ON public.user_fitness_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_ai_generated_routines_user_id ON public.ai_generated_routines(user_id);
CREATE INDEX idx_ai_generated_routines_active ON public.ai_generated_routines(user_id, is_active);
CREATE INDEX idx_routine_generation_history_user_id ON public.routine_generation_history(user_id);
CREATE INDEX idx_routine_generation_history_routine_id ON public.routine_generation_history(routine_id);
CREATE INDEX idx_user_fitness_preferences_user_id ON public.user_fitness_preferences(user_id);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_ai_generated_routines_updated_at
  BEFORE UPDATE ON public.ai_generated_routines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_fitness_preferences_updated_at
  BEFORE UPDATE ON public.user_fitness_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();