-- Add avatar variant columns to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS avatar_variant_1 TEXT,
ADD COLUMN IF NOT EXISTS avatar_variant_2 TEXT,
ADD COLUMN IF NOT EXISTS avatar_variant_3 TEXT,
ADD COLUMN IF NOT EXISTS selected_avatar_variant INTEGER DEFAULT 1;