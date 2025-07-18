-- Fix database schema for daily_nutrition_targets
-- Change calories and hydration_ml from INTEGER to NUMERIC to handle decimal calculations

ALTER TABLE public.daily_nutrition_targets 
ALTER COLUMN calories TYPE NUMERIC,
ALTER COLUMN hydration_ml TYPE NUMERIC;