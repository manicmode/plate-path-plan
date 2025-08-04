-- =============================================================================
-- CRITICAL SECURITY FIXES - Phase 1: Database Issues (Fixed)
-- =============================================================================

-- Fix 1: Drop existing function and recreate properly
DROP FUNCTION IF EXISTS public.log_security_event(text, jsonb, uuid, text);

-- Fix 2: Create security_events table with proper constraints
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Make NOT NULL for security
  event_type TEXT NOT NULL CHECK (event_type != ''),
  event_details JSONB NOT NULL DEFAULT '{}',
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  session_id TEXT
);

-- Enable RLS on security_events
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for security_events
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own security events" ON public.security_events;
  DROP POLICY IF EXISTS "System can insert security events" ON public.security_events;
  DROP POLICY IF EXISTS "Admins can view all security events" ON public.security_events;
  
  -- Create new policies
  CREATE POLICY "Users can view their own security events" 
  ON public.security_events FOR SELECT 
  USING (auth.uid() = user_id);

  CREATE POLICY "System can insert security events" 
  ON public.security_events FOR INSERT 
  WITH CHECK (true);

  -- Admins can view all security events
  CREATE POLICY "Admins can view all security events" 
  ON public.security_events FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
END $$;

-- Fix 3: Create enhanced security log function (remove SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type_param TEXT,
  event_details_param JSONB DEFAULT '{}',
  user_id_param UUID DEFAULT NULL,
  severity_param TEXT DEFAULT 'low'
)
RETURNS VOID AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Use provided user_id or current authenticated user
  target_user_id := COALESCE(user_id_param, auth.uid());
  
  -- Validate inputs
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null for security event logging';
  END IF;
  
  IF event_type_param IS NULL OR event_type_param = '' THEN
    RAISE EXCEPTION 'Event type cannot be null or empty';
  END IF;
  
  -- Insert security event
  INSERT INTO public.security_events (
    user_id,
    event_type,
    event_details,
    severity
  ) VALUES (
    target_user_id,
    event_type_param,
    COALESCE(event_details_param, '{}'),
    COALESCE(severity_param, 'low')
  );
END;
$$ LANGUAGE plpgsql;

-- Fix 4: Clean up invalid UUID data from user_notifications
DELETE FROM public.user_notifications 
WHERE user_id::text IN ('undefined', 'null', '') 
OR user_id IS NULL;

-- Fix 5: Add UUID validation constraints to critical tables
DO $$
BEGIN
  -- Add UUID validation for user_notifications if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_notifications_user_id_uuid_check' 
    AND table_name = 'user_notifications'
  ) THEN
    ALTER TABLE public.user_notifications 
    ADD CONSTRAINT user_notifications_user_id_uuid_check 
    CHECK (user_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
  END IF;

  -- Add constraint for challenge_invitations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'challenge_invitations') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'challenge_invitations_user_ids_check' 
      AND table_name = 'challenge_invitations'
    ) THEN
      ALTER TABLE public.challenge_invitations 
      ADD CONSTRAINT challenge_invitations_user_ids_check 
      CHECK (
        inviter_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND
        invitee_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      );
    END IF;
  END IF;
END $$;

-- Fix 6: Enhanced notification type validation
DO $$
BEGIN
  -- Add proper enum constraint for notification types if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_notifications_type_enum_check'
    AND table_name = 'user_notifications'
  ) THEN
    ALTER TABLE public.user_notifications 
    ADD CONSTRAINT user_notifications_type_enum_check 
    CHECK (type IN (
      'friend_request', 'challenge_invitation', 'workout_reminder', 
      'nutrition_reminder', 'achievement_unlocked', 'system_notification',
      'meditation_nudge', 'breathing_nudge', 'yoga_nudge', 'sleep_nudge'
    ));
  END IF;
END $$;

-- Fix 7: Create security monitoring trigger
CREATE OR REPLACE FUNCTION public.monitor_invalid_uuid_attempts()
RETURNS TRIGGER AS $$
BEGIN
  -- Log security event for invalid UUID attempts
  IF TG_OP = 'INSERT' THEN
    -- Check if any UUID field contains invalid values
    IF NEW.user_id::text ~* 'undefined|null|^$' THEN
      -- Only log if we have a valid user context
      IF auth.uid() IS NOT NULL THEN
        PERFORM public.log_security_event(
          'invalid_uuid_attempt',
          jsonb_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'invalid_user_id', NEW.user_id::text,
            'timestamp', now()
          ),
          auth.uid(),
          'high'
        );
      END IF;
      RAISE EXCEPTION 'Invalid UUID detected: %', NEW.user_id::text;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply monitoring trigger to critical tables
DROP TRIGGER IF EXISTS monitor_user_notifications_uuid ON public.user_notifications;
CREATE TRIGGER monitor_user_notifications_uuid
  BEFORE INSERT OR UPDATE ON public.user_notifications
  FOR EACH ROW EXECUTE FUNCTION public.monitor_invalid_uuid_attempts();

-- Fix 8: Create indexes for security events performance
CREATE INDEX IF NOT EXISTS idx_security_events_user_id_created_at 
ON public.security_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_event_type_severity 
ON public.security_events(event_type, severity, created_at DESC);