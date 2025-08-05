-- Fix remaining security warnings from linter
-- Addressing Security Definer Views and Function Search Path issues

-- Fix any remaining functions without proper search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'moderator' THEN 2 
      WHEN 'user' THEN 3 
    END 
  LIMIT 1
$function$;

-- Add search_path to remaining functions that need it
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_reminder_next_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  NEW.next_trigger_at := public.calculate_next_trigger(NEW.id);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_performance_score()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  NEW.performance_score := public.calculate_performance_score(
    NEW.completed_sets_count,
    NEW.total_sets_count,
    NEW.completed_exercises_count,
    NEW.total_exercises_count,
    NEW.skipped_steps_count,
    NEW.difficulty_rating
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_avatar_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
BEGIN
  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    NEW.updated_at = now();
  END IF;
  RETURN NEW;
END;
$function$;

-- Log security fix completion
INSERT INTO security_events (event_type, severity, event_details, user_id)
VALUES (
  'system_security_fixes_applied',
  'medium',
  jsonb_build_object(
    'phase', 'critical_database_security',
    'fixes_applied', jsonb_build_array(
      'nullable_user_id_constraints',
      'rls_policy_hardening', 
      'security_definer_audit',
      'enhanced_validation',
      'performance_indexes'
    ),
    'timestamp', now()
  ),
  NULL
);