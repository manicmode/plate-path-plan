-- Create app_role enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
  END IF;
END$$;

-- Create user_roles table if not exists
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- RLS policies for user_roles
DROP POLICY IF EXISTS user_roles_select_own ON public.user_roles;
CREATE POLICY user_roles_select_own
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;
CREATE POLICY user_roles_admin_all
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Grant permissions on user_roles
REVOKE ALL ON public.user_roles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- Function permissions for has_role
REVOKE ALL ON FUNCTION public.has_role(UUID, app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated, service_role;

-- RPC: set_user_feature_flag - for users to set their own flags
CREATE OR REPLACE FUNCTION public.set_user_feature_flag(flag_key_param TEXT, enabled_param BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify flag exists
  IF NOT EXISTS (SELECT 1 FROM public.feature_flags WHERE key = flag_key_param) THEN
    RAISE EXCEPTION 'Invalid feature flag: %', flag_key_param;
  END IF;

  -- Upsert user flag
  INSERT INTO public.user_feature_flags (user_id, flag_key, enabled)
  VALUES (auth.uid(), flag_key_param, enabled_param)
  ON CONFLICT (user_id, flag_key) 
  DO UPDATE SET 
    enabled = EXCLUDED.enabled,
    updated_at = now();

  RETURN true;
END;
$$;

-- RPC: toggle_feature_flag - admin-only for global flags
CREATE OR REPLACE FUNCTION public.toggle_feature_flag(key_param TEXT, enabled_param BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Must be authenticated admin
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- Update global flag
  UPDATE public.feature_flags 
  SET 
    enabled = enabled_param,
    updated_at = now()
  WHERE key = key_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feature flag not found: %', key_param;
  END IF;

  RETURN true;
END;
$$;

-- RPC: get_my_feature_flags - returns resolved flags for current user
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
  SELECT 
    ff.key AS flag_key,
    ff.enabled AS global_enabled,
    uff.enabled AS user_enabled,
    COALESCE(uff.enabled, ff.enabled) AS resolved_enabled,
    (uff.user_id IS NOT NULL) AS has_user_override
  FROM public.feature_flags ff
  LEFT JOIN public.user_feature_flags uff 
    ON uff.flag_key = ff.key AND uff.user_id = auth.uid()
  ORDER BY ff.key;
END;
$$;

-- Grant RPC permissions
REVOKE ALL ON FUNCTION public.set_user_feature_flag(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_feature_flag(TEXT, BOOLEAN) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.toggle_feature_flag(TEXT, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_feature_flag(TEXT, BOOLEAN) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_my_feature_flags() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_feature_flags() TO authenticated, service_role;

-- Enable realtime for feature flag tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_feature_flags;

-- Set replica identity for realtime
ALTER TABLE public.feature_flags REPLICA IDENTITY FULL;
ALTER TABLE public.user_feature_flags REPLICA IDENTITY FULL;