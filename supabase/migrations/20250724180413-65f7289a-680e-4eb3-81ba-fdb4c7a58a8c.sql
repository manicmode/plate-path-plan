-- Create security logs table for tracking function access and security events
CREATE TABLE public.security_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  function_name TEXT NOT NULL,
  ip_address TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('unauthorized', 'invalid_token', 'success', 'error')),
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
CREATE POLICY "Only admins can view security logs"
ON public.security_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- System can create security logs (no user restriction)
CREATE POLICY "System can create security logs"
ON public.security_logs
FOR INSERT
WITH CHECK (true);

-- Create indices for performance
CREATE INDEX idx_security_logs_function_name ON public.security_logs(function_name);
CREATE INDEX idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX idx_security_logs_created_at ON public.security_logs(created_at DESC);
CREATE INDEX idx_security_logs_user_id ON public.security_logs(user_id) WHERE user_id IS NOT NULL;