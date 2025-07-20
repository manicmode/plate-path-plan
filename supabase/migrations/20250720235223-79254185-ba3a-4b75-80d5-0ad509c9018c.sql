-- Add trigger_tags columns to nutrition and mood logs
ALTER TABLE public.nutrition_logs 
ADD COLUMN trigger_tags TEXT[] DEFAULT '{}';

ALTER TABLE public.supplement_logs 
ADD COLUMN trigger_tags TEXT[] DEFAULT '{}';

ALTER TABLE public.hydration_logs 
ADD COLUMN trigger_tags TEXT[] DEFAULT '{}';

-- Update the existing mood_logs table (in case it doesn't have trigger_tags)
ALTER TABLE public.mood_logs 
ADD COLUMN IF NOT EXISTS trigger_tags TEXT[] DEFAULT '{}';