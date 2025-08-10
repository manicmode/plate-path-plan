-- Add analytics flag for applied onboarding defaults
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS onboarding_defaults_applied boolean NOT NULL DEFAULT false;

-- Add explicit hydration target (mL)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS hydration_target_ml integer;