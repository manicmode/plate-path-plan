
-- Add new columns to user_profiles table for health onboarding data
ALTER TABLE public.user_profiles 
ADD COLUMN main_health_goal TEXT,
ADD COLUMN activity_level TEXT,
ADD COLUMN health_conditions TEXT[],
ADD COLUMN diet_styles TEXT[],
ADD COLUMN foods_to_avoid TEXT,
ADD COLUMN onboarding_skipped BOOLEAN DEFAULT FALSE,
ADD COLUMN show_onboarding_reminder BOOLEAN DEFAULT TRUE;

-- Add check constraints for the new fields
ALTER TABLE public.user_profiles 
ADD CONSTRAINT check_main_health_goal 
CHECK (main_health_goal IN ('lose_weight', 'gain_muscle', 'maintain_weight', 'eat_healthier', 'improve_energy', 'improve_digestion', 'other') OR main_health_goal IS NULL);

ALTER TABLE public.user_profiles 
ADD CONSTRAINT check_activity_level 
CHECK (activity_level IN ('sedentary', 'light', 'moderate', 'very_active') OR activity_level IS NULL);
