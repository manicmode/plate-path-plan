-- Create probe
CREATE OR REPLACE FUNCTION public._arena_admin_probe()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $$
DECLARE
  v_user uuid;
  rep jsonb := '{}'::jsonb;
  r_ensure record;
  r_chosen record;
  v_chosen_id uuid;
  v_post_id uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users ORDER BY created_at DESC LIMIT 1;
  IF v_user IS NULL THEN
    SELECT user_id INTO v_user FROM public.rank20_members LIMIT 1;
  END IF;
  IF v_user IS NULL THEN
    rep := rep || jsonb_build_object('fatal', 'No user found in auth.users or rank20_members');
    RETURN rep::json;
  END IF;

  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('role','authenticated','sub',v_user)::text,
    true
  );

  BEGIN
    SELECT * INTO r_ensure FROM ensure_rank20_membership() LIMIT 1;
    rep := rep || jsonb_build_object('ensure_rank20_membership', row_to_json(r_ensure));
  EXCEPTION WHEN OTHERS THEN
    rep := rep || jsonb_build_object('ensure_rank20_membership_error', SQLERRM);
  END;

  BEGIN
    SELECT * INTO r_chosen FROM my_rank20_chosen_challenge() LIMIT 1;
    rep := rep || jsonb_build_object('my_rank20_chosen_challenge', row_to_json(r_chosen));
  EXCEPTION WHEN OTHERS THEN
    rep := rep || jsonb_build_object('my_rank20_chosen_challenge_error', SQLERRM);
  END;

  BEGIN
    SELECT my_rank20_chosen_challenge_id() INTO v_chosen_id;
    rep := rep || jsonb_build_object('my_rank20_chosen_challenge_id', v_chosen_id::text);
  EXCEPTION WHEN OTHERS THEN
    rep := rep || jsonb_build_object('my_rank20_chosen_challenge_id_error', SQLERRM);
  END;

  BEGIN
    SELECT arena_post_message('stability smoke (probe)') INTO v_post_id;
    rep := rep || jsonb_build_object('arena_post_message_id', v_post_id::text);
  EXCEPTION WHEN OTHERS THEN
    rep := rep || jsonb_build_object('arena_post_message_error', SQLERRM);
  END;

  RETURN rep::json;
END
$$;
ALTER FUNCTION public._arena_admin_probe() OWNER TO postgres;
REVOKE ALL ON FUNCTION public._arena_admin_probe() FROM PUBLIC;

-- Execute once and print
DO $$
DECLARE j json;
BEGIN
  SELECT public._arena_admin_probe() INTO j;
  RAISE NOTICE 'ARENA_PROBE_RESULT: %', j::text;
END $$;

-- Clean up
DROP FUNCTION public._arena_admin_probe();