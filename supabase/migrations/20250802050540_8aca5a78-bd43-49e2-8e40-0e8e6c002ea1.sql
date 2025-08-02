-- Add monthly generation tracking and caricature history to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS last_caricature_generation TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS caricature_history JSONB DEFAULT '[]'::jsonb;

-- Update existing users to reset their generation count for the new monthly system
UPDATE public.user_profiles 
SET caricature_generation_count = 0, 
    last_caricature_generation = NULL 
WHERE caricature_generation_count IS NOT NULL;