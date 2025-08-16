-- Finalize Arena scoring hardening: backward compatibility + guardrails
-- Drop existing functions first to avoid parameter default conflicts

DROP FUNCTION IF EXISTS public.arena_award_points(numeric, text, uuid);
DROP FUNCTION IF EXISTS public.arena_award_points(numeric, text, uuid, text);

-- 2) Add soft guardrails to the 4-arg implementation (create this FIRST)
CREATE OR REPLACE FUNCTION public.arena_award_points(
  p_points numeric,
  p_kind   text,
  p_challenge_id uuid DEFAULT NULL,
  p_idem_key text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_cid uuid;
BEGIN
  IF p_points IS NULL OR p_points <= 0 THEN RETURN; END IF;
  IF p_kind IS NULL OR btrim(p_kind) = '' THEN
    RAISE EXCEPTION 'arena_award_points: kind must be non-empty';
  END IF;

  IF p_challenge_id IS NULL THEN
    SELECT id INTO v_cid
    FROM public.arena_challenges
    WHERE status = 'active'
    ORDER BY starts_at DESC NULLS LAST
    LIMIT 1;
    IF v_cid IS NULL THEN
      RAISE EXCEPTION 'arena_award_points: no active challenge found';
    END IF;
  ELSE
    v_cid := p_challenge_id;
  END IF;

  INSERT INTO public.arena_memberships (challenge_id, user_id, status)
  VALUES (v_cid, auth.uid(), 'active')
  ON CONFLICT (challenge_id, user_id) DO UPDATE SET status = 'active';

  INSERT INTO public.arena_events (challenge_id, user_id, points, kind, idem_key)
  VALUES (v_cid, auth.uid(), p_points, p_kind, p_idem_key);
END
$func$;

ALTER FUNCTION public.arena_award_points(numeric, text, uuid, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.arena_award_points(numeric, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_award_points(numeric, text, uuid, text) TO authenticated;

-- 1) Backward-compatible wrapper (create this SECOND)
CREATE OR REPLACE FUNCTION public.arena_award_points(
  p_points numeric,
  p_kind   text,
  p_challenge_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.arena_award_points(p_points, p_kind, p_challenge_id, NULL::text);
END
$$;

ALTER FUNCTION public.arena_award_points(numeric, text, uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.arena_award_points(numeric, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_award_points(numeric, text, uuid) TO authenticated;