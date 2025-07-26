-- Add saturated_fat column to nutrition_logs table
ALTER TABLE public.nutrition_logs 
ADD COLUMN IF NOT EXISTS saturated_fat numeric DEFAULT 0;