-- Fix remaining database functions with explicit search_path
ALTER FUNCTION public.get_user_private_challenge_access(uuid) SET search_path = 'public', 'pg_catalog';
ALTER FUNCTION public.calculate_challenge_progress(uuid) SET search_path = 'public', 'pg_catalog';

-- Create security event logging table
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  event_details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for security events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view security events
CREATE POLICY "Admins can view security events" 
ON public.security_events 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- System can create security events
CREATE POLICY "System can create security events" 
ON public.security_events 
FOR INSERT 
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX idx_security_events_created_at ON public.security_events(created_at DESC);
CREATE INDEX idx_security_events_severity ON public.security_events(severity);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type_param TEXT,
  event_details_param JSONB DEFAULT '{}',
  user_id_param UUID DEFAULT auth.uid(),
  severity_param TEXT DEFAULT 'low'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_catalog'
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    event_details,
    severity
  ) VALUES (
    user_id_param,
    event_type_param,
    event_details_param,
    severity_param
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;