-- Fix friend request functions with proper auth guards and error codes

CREATE OR REPLACE FUNCTION public.send_friend_request(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  pending_count integer;
  allows_requests boolean;
BEGIN
  -- Auth + self guard
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;
  IF target_user_id IS NULL OR target_user_id = current_user_id THEN
    RAISE EXCEPTION 'Invalid target user' USING ERRCODE = 'P0001';
  END IF;

  -- Privacy (defaults to true if no row)
  SELECT COALESCE(allow_challenge_friend_requests, true)
  INTO allows_requests
  FROM public.user_privacy_settings
  WHERE user_id = target_user_id;

  IF NOT COALESCE(allows_requests, true) THEN
    RAISE EXCEPTION 'FRIEND_REQS_DISABLED' USING ERRCODE = 'P0001';
  END IF;

  -- Rate limit: 5 pending in rolling 24h
  SELECT COUNT(*)
  INTO pending_count
  FROM public.user_friends
  WHERE user_id = current_user_id
    AND status = 'pending'
    AND created_at > now() - interval '24 hours';

  IF pending_count >= 5 THEN
    RAISE EXCEPTION 'FRIEND_REQS_RATE_LIMIT' USING ERRCODE = 'P0001';
  END IF;

  -- Prevent dupes (either direction)
  IF EXISTS (
    SELECT 1 FROM public.user_friends
    WHERE (user_id = current_user_id AND friend_id = target_user_id)
       OR (user_id = target_user_id AND friend_id = current_user_id)
  ) THEN
    RETURN false;
  END IF;

  -- Create request
  INSERT INTO public.user_friends (user_id, friend_id, status)
  VALUES (current_user_id, target_user_id, 'pending');

  -- Notify receiver
  PERFORM public.notify_friend_request_incoming(target_user_id, current_user_id);

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  requester_id uuid;
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = 'P0001';
  END IF;

  -- Ensure this request is for me and pending
  SELECT user_id INTO requester_id
  FROM public.user_friends
  WHERE id = request_id
    AND friend_id = current_user_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Accept original request
  UPDATE public.user_friends
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;

  -- Insert reciprocal (idempotent)
  INSERT INTO public.user_friends (user_id, friend_id, status)
  VALUES (current_user_id, requester_id, 'accepted')
  ON CONFLICT (user_id, friend_id) DO NOTHING;

  -- Notify original sender
  PERFORM public.notify_friend_request_accepted(requester_id, current_user_id);

  RETURN true;
END;
$$;