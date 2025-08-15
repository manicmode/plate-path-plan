-- A) Backend: instrument arena_post_message to return precise error text
CREATE OR REPLACE FUNCTION public.arena_post_message(p_content text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_group uuid;
  v_challenge uuid;
  v_id uuid;
BEGIN
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Message body is empty';
  END IF;

  -- Ensure membership and get challenge_id
  SELECT group_id, challenge_id
  INTO v_group, v_challenge
  FROM public.ensure_rank20_membership();

  BEGIN
    INSERT INTO public.rank20_chat_messages (challenge_id, user_id, body)
    VALUES (v_challenge, auth.uid(), p_content)
    RETURNING id INTO v_id;

    RETURN v_id;

  EXCEPTION WHEN OTHERS THEN
    -- Bubble the exact DB error to the client
    RAISE EXCEPTION 'arena_post_message failed [%]: %', SQLSTATE, SQLERRM;
  END;
END;
$$;

ALTER FUNCTION public.arena_post_message(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.arena_post_message(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_post_message(text) TO authenticated, service_role;