-- Create count_admins function
CREATE OR REPLACE FUNCTION public.count_admins()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COUNT(*)::integer FROM public.user_roles WHERE role = 'admin';
$$;

-- Improved race-safe bootstrap_admin function
CREATE OR REPLACE FUNCTION public.bootstrap_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  inserted int;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Serialize concurrent bootstraps (same key across deployments)
  PERFORM pg_advisory_xact_lock(hashtext('bootstrap_admin_lock'));

  -- If an admin already exists, bail
  IF (SELECT COUNT(*) FROM public.user_roles WHERE role = 'admin') > 0 THEN
    RAISE EXCEPTION 'Admin already exists';
  END IF;

  -- Insert admin role; ON CONFLICT protects against edge cases
  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  GET DIAGNOSTICS inserted = ROW_COUNT;
  IF inserted = 0 THEN
    -- Someone else won the race or role already present
    RAISE EXCEPTION 'Admin already exists';
  END IF;

  RETURN true;
END;
$$;

-- Grant execute permissions to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.bootstrap_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_admins() TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_admin() TO service_role;
GRANT EXECUTE ON FUNCTION public.count_admins() TO service_role;