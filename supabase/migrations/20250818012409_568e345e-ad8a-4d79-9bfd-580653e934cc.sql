-- Create habit_user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.habit_user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  preferred_tone text DEFAULT 'gentle',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.habit_user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own preferences" ON public.habit_user_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON public.habit_user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON public.habit_user_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_habit_user_preferences_updated_at
  BEFORE UPDATE ON public.habit_user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Check if preferred_tone column exists, add if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'habit_user_preferences' 
    AND column_name = 'preferred_tone'
  ) THEN
    ALTER TABLE public.habit_user_preferences ADD COLUMN preferred_tone text DEFAULT 'gentle';
  END IF;
END $$;