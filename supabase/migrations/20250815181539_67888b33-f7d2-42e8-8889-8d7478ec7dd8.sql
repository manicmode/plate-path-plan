-- One-shot, end-to-end Arena chat health check (no auth.users needed)
-- Runs as SECURITY DEFINER and simulates a user via request.jwt.claim.sub

CREATE OR REPLACE FUNCTION public.run_arena_chat_healthcheck(p_user_id uuid DEFAULT NULL)
RETURNS TABLE(step text, info jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user uuid;
  v_group uuid;
  v_chal uuid;
  v_new_id uuid;
  v_err text;
BEGIN
  -- 0) Choose a user: prefer an existing rank20 member; else use the parameter
  v_user := p_user_id;
  IF v_user IS NULL THEN
    SELECT rm.user_id INTO v_user
    FROM public.rank20_members rm
    ORDER BY rm.joined_at DESC
    LIMIT 1;
  END IF;

  IF v_user IS NULL THEN
    RETURN QUERY SELECT 'error', json_build_object('message','no users found in rank20_members; supply p_user_id')::jsonb;
    RETURN;
  END IF;

  -- Simulate JWT user for auth.uid()
  PERFORM set_config('request.jwt.claim.sub', v_user::text, true);
  RETURN QUERY SELECT 'step0', json_build_object('user_id', v_user);

  -- 1) Ensure membership (should return exactly one row)
  RETURN QUERY
    SELECT 'step1_ensure', to_jsonb(e)
    FROM public.ensure_rank20_membership() e
    LIMIT 1;

  -- Capture group/challenge for later checks
  SELECT e.group_id, e.challenge_id
    INTO v_group, v_chal
  FROM public.ensure_rank20_membership() e
  LIMIT 1;

  RETURN QUERY SELECT 'step1b_ids', json_build_object('group_id', v_group, 'challenge_id', v_chal);

  -- 2) Resolver should match the same challenge and include member_count
  RETURN QUERY
    SELECT 'step2_resolver', to_jsonb(r)
    FROM public.my_rank20_chosen_challenge_id() r;

  -- 3) Try to send a message; on failure, surface SQLSTATE+message
  BEGIN
    SELECT public.arena_post_message('healthcheck ' || now()::text) INTO v_new_id;
    RETURN QUERY SELECT 'step3_send_ok', json_build_object('new_message_id', v_new_id);
  EXCEPTION WHEN OTHERS THEN
    v_err := format('arena_post_message failed [%s]: %s', SQLSTATE, SQLERRM);
    RETURN QUERY SELECT 'step3_send_error', json_build_object('error', v_err);
  END;

  -- 4) Read back recent messages for this challenge (proves persistence)
  RETURN QUERY
  SELECT 'step4_recent',
         json_build_object(
           'challenge_id', v_chal,
           'recent', COALESCE(json_agg(t), '[]'::json)
         )
  FROM (
    SELECT id, left(body,80) AS body, created_at
    FROM public.rank20_chat_messages
    WHERE challenge_id = v_chal
    ORDER BY created_at DESC
    LIMIT 5
  ) t;

  -- 5) PCP rows (idempotent check)
  RETURN QUERY
  SELECT 'step5_pcp',
         json_build_object(
           'pcp', COALESCE(
             (SELECT json_agg(row_to_json(p))
              FROM (
                SELECT private_challenge_id, user_id, created_at
                FROM public.private_challenge_participations
                WHERE user_id = v_user
                ORDER BY created_at DESC
                LIMIT 5
              ) p),
             '[]'::json)
         );

  -- 6) Security sanity: anon must NOT be able to execute these
  RETURN QUERY
  SELECT 'step6_security',
         json_build_object(
           'anon_can_exec', json_build_object(
             'ensure_rank20_membership',
               has_function_privilege('anon','public.ensure_rank20_membership()','EXECUTE'),
             'arena_post_message',
               has_function_privilege('anon','public.arena_post_message(text)','EXECUTE'),
             'my_rank20_chosen_challenge_id',
               has_function_privilege('anon','public.my_rank20_chosen_challenge_id()','EXECUTE')
           )
         );
END;
$$;

ALTER FUNCTION public.run_arena_chat_healthcheck(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.run_arena_chat_healthcheck(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_arena_chat_healthcheck(uuid) TO authenticated, service_role;