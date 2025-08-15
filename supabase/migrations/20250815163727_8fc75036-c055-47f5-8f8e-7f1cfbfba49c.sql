-- Fix arena_post_message function to use correct column name and add debug logging
CREATE OR REPLACE FUNCTION public.arena_post_message(p_content text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE 
  v_challenge uuid; 
  v_id uuid;
  v_group_id uuid;
BEGIN
  -- Debug: Log user ID
  RAISE LOG 'arena_post_message called by user: %', auth.uid();
  
  -- Get the challenge_id for the current user
  SELECT rg.challenge_id, rg.id INTO v_challenge, v_group_id
  FROM public.rank20_groups rg
  JOIN public.rank20_members rm ON rm.group_id = rg.id
  WHERE rm.user_id = auth.uid()
  LIMIT 1;

  -- Debug: Log what we found
  RAISE LOG 'arena_post_message found challenge_id: %, group_id: %', v_challenge, v_group_id;

  IF v_challenge IS NULL THEN
    RAISE LOG 'arena_post_message: No arena membership for user %', auth.uid();
    RAISE EXCEPTION 'No arena membership for caller';
  END IF;

  -- Insert the message with the correct challenge_id (using 'body' column, not 'content')
  INSERT INTO public.rank20_chat_messages (challenge_id, user_id, body)
  VALUES (v_challenge, auth.uid(), p_content)
  RETURNING id INTO v_id;

  RAISE LOG 'arena_post_message: Successfully inserted message with id: %', v_id;

  RETURN v_id;
END;
$$;