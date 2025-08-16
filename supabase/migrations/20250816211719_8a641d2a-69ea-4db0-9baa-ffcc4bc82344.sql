BEGIN;

CREATE OR REPLACE FUNCTION public.arena_ui_server_smoketest()
RETURNS TABLE(path text, challenge_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
BEGIN
  -- Try SECURITY DEFINER safe wrapper
  BEGIN
    SELECT public.my_rank20_chosen_challenge_id_safe() INTO cid;
    IF cid IS NOT NULL THEN
      INSERT INTO arena_ui_heartbeat(label) VALUES ('server:cid:rpc-safe');
      RETURN QUERY SELECT 'rpc-safe'::text, cid;
      RETURN;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- swallow and continue
  END;

  -- Try SECURITY DEFINER server fallback
  BEGIN
    SELECT public.my_rank20_active_challenge_id_fallback() INTO cid;
    IF cid IS NOT NULL THEN
      INSERT INTO arena_ui_heartbeat(label) VALUES ('server:cid:rpc-fallback');
      RETURN QUERY SELECT 'rpc-fallback'::text, cid;
      RETURN;
    END IF;
  EXCEPTION WHEN OTHERS THEN
  END;

  -- If we got here, neither path produced an id
  INSERT INTO arena_ui_heartbeat(label) VALUES ('server:cid:none');
  RETURN QUERY SELECT 'none'::text, NULL::uuid;
END
$$;

REVOKE ALL ON FUNCTION public.arena_ui_server_smoketest() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.arena_ui_server_smoketest() TO authenticated;
ALTER FUNCTION public.arena_ui_server_smoketest() OWNER TO postgres;

COMMIT;