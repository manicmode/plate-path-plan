-- Add daily_performance_score column to daily_nutrition_targets table
ALTER TABLE public.daily_nutrition_targets
ADD COLUMN daily_performance_score NUMERIC(5,2) DEFAULT 0;