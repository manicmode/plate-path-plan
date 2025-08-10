BEGIN;

-- 1) Patch logging trigger function to avoid NULL user_id during signup
CREATE OR REPLACE FUNCTION public.log_critical_security_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog'
AS $function$
DECLARE
  v_user uuid;
BEGIN
  -- Use session user if present, else the row’s user_id from the trigger context
  v_user := COALESCE(auth.uid(), NEW.user_id);

  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'user_roles' THEN
    INSERT INTO public.security_events (event_type, severity, event_details, user_id)
    VALUES (
      'role_assignment_created',
      'high',
      jsonb_build_object(
        'assigned_role', NEW.role,
        'target_user_id', NEW.user_id,
        'table', TG_TABLE_NAME,
        'operation', TG_OP
      ),
      v_user
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

ALTER FUNCTION public.log_critical_security_event() OWNER TO postgres;

-- 2) Deduplicate signup triggers on auth.users (keep a single canonical one)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

COMMIT;