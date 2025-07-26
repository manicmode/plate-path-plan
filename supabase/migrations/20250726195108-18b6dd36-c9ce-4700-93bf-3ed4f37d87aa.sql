-- Create index on nutrition_logs for better query performance on saved foods
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_id_created_at 
ON public.nutrition_logs (user_id, created_at DESC);

-- Create index on nutrition_logs for food name queries
CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_id_food_name 
ON public.nutrition_logs (user_id, food_name);