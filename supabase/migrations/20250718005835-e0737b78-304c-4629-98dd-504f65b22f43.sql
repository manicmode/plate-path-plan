-- Add supplement_recommendations field to daily_nutrition_targets table
ALTER TABLE public.daily_nutrition_targets 
ADD COLUMN supplement_recommendations jsonb DEFAULT '[]'::jsonb;