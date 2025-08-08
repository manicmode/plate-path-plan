-- Clean up any orphan nutrition_logs with NULL user_id
DELETE FROM public.nutrition_logs WHERE user_id IS NULL;

-- Enable RLS on nutrition_logs (if not already enabled)
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies on nutrition_logs
DROP POLICY IF EXISTS "Users can view their own nutrition logs" ON public.nutrition_logs;
DROP POLICY IF EXISTS "Users can create their own nutrition logs" ON public.nutrition_logs;
DROP POLICY IF EXISTS "Users can update their own nutrition logs" ON public.nutrition_logs;
DROP POLICY IF EXISTS "Users can delete their own nutrition logs" ON public.nutrition_logs;
DROP POLICY IF EXISTS "Enable select for authenticated users based on user_id" ON public.nutrition_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users based on user_id" ON public.nutrition_logs;
DROP POLICY IF EXISTS "Enable update for authenticated users based on user_id" ON public.nutrition_logs;
DROP POLICY IF EXISTS "Enable delete for authenticated users based on user_id" ON public.nutrition_logs;

-- Create secure RLS policies
CREATE POLICY "Users can insert their own nutrition logs" 
ON public.nutrition_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can select their own nutrition logs" 
ON public.nutrition_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition logs" 
ON public.nutrition_logs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nutrition logs" 
ON public.nutrition_logs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Make user_id NOT NULL to prevent future issues
ALTER TABLE public.nutrition_logs 
ALTER COLUMN user_id SET NOT NULL;