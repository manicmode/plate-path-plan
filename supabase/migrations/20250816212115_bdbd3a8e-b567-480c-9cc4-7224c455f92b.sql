BEGIN;

CREATE OR REPLACE FUNCTION public.arena_ui_server_smoketest_ping()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
BEGIN
  -- try safe wrapper
  BEGIN
    SELECT public.my_rank20_chosen_challenge_id_safe() INTO cid;
    IF cid IS NOT NULL THEN
      INSERT INTO arena_ui_heartbeat(label) VALUES ('server:cid:rpc-safe');
      RETURN;
    END IF;
  EXCEPTION WHEN OTHERS THEN
  END;

  -- try server fallback
  BEGIN
    SELECT public.my_rank20_active_challenge_id_fallback() INTO cid;
    IF cid IS NOT NULL THEN
      INSERT INTO arena_ui_heartbeat(label) VALUES ('server:cid:rpc-fallback');
      RETURN;
    END IF;
  EXCEPTION WHEN OTHERS THEN
  END;

  INSERT INTO arena_ui_heartbeat(label) VALUES ('server:cid:none');
END
$$;

REVOKE ALL ON FUNCTION public.arena_ui_server_smoketest_ping() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.arena_ui_server_smoketest_ping() TO supabase_read_only_user;

ALTER FUNCTION public.arena_ui_server_smoketest_ping() OWNER TO postgres;

COMMIT;