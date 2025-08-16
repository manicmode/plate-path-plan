-- Finalize Arena scoring hardening: backward compatibility + guardrails

-- 1) Backward-compatible wrapper (keeps old signature alive)
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
  -- Delegate to the 4-arg version with NULL idem_key (legacy behavior)
  PERFORM public.arena_award_points(p_points, p_kind, p_challenge_id, NULL::text);
END
$$;

-- Ensure only authenticated can execute (tighten privileges if replaced)
REVOKE ALL ON FUNCTION public.arena_award_points(numeric, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_award_points(numeric, text, uuid) TO authenticated;

-- 2) Add soft guardrails to the 4-arg implementation
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
  -- Guardrails
  IF p_points IS NULL OR p_points <= 0 THEN
    RETURN;
  END IF;
  IF p_kind IS NULL OR btrim(p_kind) = '' THEN
    RAISE EXCEPTION 'arena_award_points: kind must be non-empty';
  END IF;

  -- Resolve challenge id
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

  -- Ensure membership (idempotent)
  INSERT INTO public.arena_memberships (challenge_id, user_id, status)
  VALUES (v_cid, auth.uid(), 'active')
  ON CONFLICT (challenge_id, user_id) DO UPDATE SET status = 'active';

  -- Insert event (idempotent if idem_key provided)
  INSERT INTO public.arena_events (challenge_id, user_id, points, kind, idem_key)
  VALUES (v_cid, auth.uid(), p_points, p_kind, p_idem_key);
END
$func$;

-- Tighten privileges on the 4-arg function (re-apply after replace)
REVOKE ALL ON FUNCTION public.arena_award_points(numeric, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_award_points(numeric, text, uuid, text) TO authenticated;