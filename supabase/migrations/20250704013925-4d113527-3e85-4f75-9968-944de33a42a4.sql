
-- Add personal information fields to user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN age INTEGER,
ADD COLUMN height_feet INTEGER,
ADD COLUMN height_inches INTEGER,
ADD COLUMN height_cm INTEGER,
ADD COLUMN weight NUMERIC,
ADD COLUMN weight_unit TEXT DEFAULT 'lb' CHECK (weight_unit IN ('lb', 'kg')),
ADD COLUMN gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN height_unit TEXT DEFAULT 'ft' CHECK (height_unit IN ('ft', 'cm'));
