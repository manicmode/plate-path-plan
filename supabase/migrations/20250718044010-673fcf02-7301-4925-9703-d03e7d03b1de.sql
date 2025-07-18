-- Add additional nutrition targets to daily_nutrition_targets table
ALTER TABLE public.daily_nutrition_targets 
ADD COLUMN IF NOT EXISTS sugar numeric,
ADD COLUMN IF NOT EXISTS sodium numeric,
ADD COLUMN IF NOT EXISTS saturated_fat numeric;

-- Update the calculate-daily-targets function to include these new fields
-- No additional database changes needed as this will be handled in the edge function