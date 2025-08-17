-- Create feature flags table
CREATE TABLE public.feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature flags
CREATE POLICY "Anyone can read feature flags" 
ON public.feature_flags 
FOR SELECT 
USING (true);

-- Only system can modify feature flags
CREATE POLICY "System can manage feature flags" 
ON public.feature_flags 
FOR ALL 
USING (false)
WITH CHECK (false);

-- Insert friend CTAs flag
INSERT INTO public.feature_flags (key, enabled) 
VALUES ('friend_ctas', true);

-- Create secure RPC to check if feature is enabled
CREATE OR REPLACE FUNCTION public.is_feature_enabled(feature_key text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT COALESCE(enabled, false)
  FROM public.feature_flags 
  WHERE key = feature_key;
$function$;