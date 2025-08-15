-- Create secure insert RPC so challenge_id is always derived server-side
CREATE OR REPLACE FUNCTION public.arena_post_message(p_content text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE 
  v_challenge uuid; 
  v_id uuid;
BEGIN
  -- Get the challenge_id for the current user
  SELECT rg.challenge_id INTO v_challenge
  FROM public.rank20_groups rg
  JOIN public.rank20_members rm ON rm.group_id = rg.id
  WHERE rm.user_id = auth.uid()
  LIMIT 1;

  IF v_challenge IS NULL THEN
    RAISE EXCEPTION 'No arena membership for caller';
  END IF;

  -- Insert the message with the correct challenge_id
  INSERT INTO public.rank20_chat_messages (challenge_id, user_id, content)
  VALUES (v_challenge, auth.uid(), p_content)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Secure the function
REVOKE ALL ON FUNCTION public.arena_post_message(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_post_message(text) TO authenticated, service_role;