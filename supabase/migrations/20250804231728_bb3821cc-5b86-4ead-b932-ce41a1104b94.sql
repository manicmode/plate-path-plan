-- Enable RLS on muscle_group_trends view and add policy
ALTER VIEW public.muscle_group_trends SET (security_barrier = true);

-- Add RLS policy for muscle_group_trends
CREATE POLICY "Users can view their own muscle group trends" 
ON public.muscle_group_trends 
FOR SELECT 
USING (auth.uid() = user_id);