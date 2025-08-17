-- Add function to cancel outgoing friend requests
CREATE OR REPLACE FUNCTION public.cancel_friend_request(request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  current_user_id uuid := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE='P0001';
  END IF;
  UPDATE public.user_friends
  SET status='canceled', updated_at=now()
  WHERE id=request_id
    AND user_id=current_user_id
    AND status='pending';
  IF NOT FOUND THEN RETURN false; END IF;
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.cancel_friend_request(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_friend_request(uuid) TO authenticated;