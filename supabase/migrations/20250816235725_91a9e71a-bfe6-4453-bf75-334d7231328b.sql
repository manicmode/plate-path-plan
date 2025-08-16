-- ========================================
-- Privacy Settings for Friend System (Back-Compatible)
-- ========================================

-- A) Create privacy settings table
CREATE TABLE IF NOT EXISTS public.user_privacy_settings (
  user_id uuid PRIMARY KEY,
  allow_challenge_friend_requests boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own privacy settings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_privacy_settings' AND policyname='p_privacy_select_own'
  ) THEN
    CREATE POLICY p_privacy_select_own
    ON public.user_privacy_settings
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_privacy_settings' AND policyname='p_privacy_insert_own'
  ) THEN
    CREATE POLICY p_privacy_insert_own
    ON public.user_privacy_settings
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_privacy_settings' AND policyname='p_privacy_update_own'
  ) THEN
    CREATE POLICY p_privacy_update_own
    ON public.user_privacy_settings
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_privacy_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'tr_privacy_settings_updated_at'
  ) THEN
    CREATE TRIGGER tr_privacy_settings_updated_at
    BEFORE UPDATE ON public.user_privacy_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_privacy_settings_updated_at();
  END IF;
END $$;

-- B) Helper RPCs (SECURITY DEFINER)

-- Upsert privacy settings for current user
CREATE OR REPLACE FUNCTION public.upsert_privacy_settings(allow boolean)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.user_privacy_settings (user_id, allow_challenge_friend_requests)
  VALUES (auth.uid(), allow)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    allow_challenge_friend_requests = EXCLUDED.allow_challenge_friend_requests,
    updated_at = now();
$$;

REVOKE ALL ON FUNCTION public.upsert_privacy_settings(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_privacy_settings(boolean) TO authenticated;
ALTER FUNCTION public.upsert_privacy_settings(boolean) OWNER TO postgres;

-- Get privacy settings for multiple users (public info only)
CREATE OR REPLACE FUNCTION public.get_privacy_settings_for_users(target_ids uuid[])
RETURNS TABLE (user_id uuid, allow_challenge_friend_requests boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    u.user_id,
    COALESCE(ups.allow_challenge_friend_requests, true) as allow_challenge_friend_requests
  FROM unnest(target_ids) AS u(user_id)
  LEFT JOIN public.user_privacy_settings ups ON ups.user_id = u.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_privacy_settings_for_users(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_privacy_settings_for_users(uuid[]) TO authenticated;
ALTER FUNCTION public.get_privacy_settings_for_users(uuid[]) OWNER TO postgres;

-- C) Update send_friend_request with privacy + rate limit guards
CREATE OR REPLACE FUNCTION public.send_friend_request(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  pending_count integer;
  target_allows_requests boolean;
BEGIN
  -- Validate inputs
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;
  
  IF target_user_id IS NULL OR current_user_id = target_user_id THEN
    RAISE EXCEPTION 'Invalid target user' USING ERRCODE = 'P0001';
  END IF;

  -- Rate limit check: max 5 outgoing pending requests per 24h rolling window
  SELECT COUNT(*)
  INTO pending_count
  FROM public.user_friends
  WHERE user_id = current_user_id
    AND status = 'pending'
    AND created_at > now() - INTERVAL '24 hours';
  
  IF pending_count >= 5 THEN
    RAISE EXCEPTION 'FRIEND_REQS_RATE_LIMIT' USING ERRCODE = 'P0001';
  END IF;

  -- Privacy check: does target allow friend requests?
  SELECT COALESCE(ups.allow_challenge_friend_requests, true)
  INTO target_allows_requests
  FROM public.user_privacy_settings ups
  WHERE ups.user_id = target_user_id;
  
  -- If no row exists, default to true (allowed)
  target_allows_requests := COALESCE(target_allows_requests, true);
  
  IF NOT target_allows_requests THEN
    RAISE EXCEPTION 'FRIEND_REQS_DISABLED' USING ERRCODE = 'P0001';
  END IF;

  -- Check if friendship already exists
  IF EXISTS (
    SELECT 1 FROM public.user_friends 
    WHERE (user_id = current_user_id AND friend_id = target_user_id)
       OR (user_id = target_user_id AND friend_id = current_user_id)
  ) THEN
    RETURN false; -- Friendship already exists or pending
  END IF;
  
  -- Create friend request
  INSERT INTO public.user_friends (user_id, friend_id, status)
  VALUES (current_user_id, target_user_id, 'pending');
  
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.send_friend_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_friend_request(uuid) TO authenticated;
ALTER FUNCTION public.send_friend_request(uuid) OWNER TO postgres;