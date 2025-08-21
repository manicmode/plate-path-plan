-- A. Self-scoped admin check (clients use this; cannot enumerate others)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- B. Prevent role enumeration via has_role(user_id, role)
--    (still callable by policies; users cannot probe other IDs)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RETURN FALSE; END IF;

  -- Only allow checking yourself, unless running as service_role
  IF caller <> _user_id AND current_user <> 'service_role' THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = _user_id AND role = _role);
END;
$$;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

-- C. Update RLS policy to use self-scoped check
DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;
CREATE POLICY user_roles_admin_all
  ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- D. Force RLS everywhere (belt + suspenders)
ALTER TABLE public.feature_flags        FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_flags   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles           FORCE ROW LEVEL SECURITY;

-- E. Server-only function: count_admins (no client access)
REVOKE ALL ON FUNCTION public.count_admins() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.count_admins() TO service_role;

-- F. Ensure all definer functions pin search_path (no-ops if already set)
-- (Recreate with SET search_path for completeness)
CREATE OR REPLACE FUNCTION public.set_user_feature_flag(flag_key_param TEXT, enabled_param BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.feature_flags WHERE key = flag_key_param) THEN
    RAISE EXCEPTION 'Invalid feature flag: %', flag_key_param;
  END IF;
  INSERT INTO public.user_feature_flags (user_id, flag_key, enabled)
  VALUES (auth.uid(), flag_key_param, enabled_param)
  ON CONFLICT (user_id, flag_key)
  DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = now();
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.toggle_feature_flag(key_param TEXT, enabled_param BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  UPDATE public.feature_flags SET enabled = enabled_param, updated_at = now()
  WHERE key = key_param;
  IF NOT FOUND THEN RAISE EXCEPTION 'Feature flag not found: %', key_param; END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.get_my_feature_flags()
RETURNS TABLE (
  flag_key TEXT,
  global_enabled BOOLEAN,
  user_enabled BOOLEAN,
  resolved_enabled BOOLEAN,
  has_user_override BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT ff.key,
         ff.enabled,
         uff.enabled,
         COALESCE(uff.enabled, ff.enabled),
         (uff.user_id IS NOT NULL)
  FROM public.feature_flags ff
  LEFT JOIN public.user_feature_flags uff
    ON uff.flag_key = ff.key AND uff.user_id = auth.uid()
  ORDER BY ff.key;
END; $$;

REVOKE ALL ON FUNCTION public.set_user_feature_flag(TEXT,BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_feature_flag(TEXT,BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_my_feature_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_feature_flag(TEXT,BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_feature_flag(TEXT,BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_feature_flags()           TO authenticated, service_role;