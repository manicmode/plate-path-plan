-- Monthly rollup recompute: deterministic, fast, capped
CREATE OR REPLACE FUNCTION public.arena_recompute_rollups_monthly(
  p_challenge_id uuid DEFAULT NULL,
  p_section text DEFAULT 'global',
  p_year int  DEFAULT date_part('year', now())::int,
  p_month int DEFAULT date_part('month', now())::int,
  p_limit int DEFAULT 10000
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cid uuid;
BEGIN
  -- Resolve challenge
  IF p_challenge_id IS NULL THEN
    SELECT id INTO v_cid
    FROM public.arena_challenges
    WHERE status='active'
    ORDER BY starts_at DESC NULLS LAST
    LIMIT 1;
  ELSE
    v_cid := p_challenge_id;
  END IF;

  IF v_cid IS NULL THEN
    RAISE NOTICE 'No active arena challenge; skipping rollup.';
    RETURN;
  END IF;

  -- month bounds (index-friendly on occurred_at)
  WITH bounds AS (
    SELECT make_timestamp(p_year, p_month, 1, 0, 0, 0)::timestamptz AS start_ts,
           (make_timestamp(p_year, p_month, 1, 0, 0, 0) + INTERVAL '1 month')::timestamptz AS end_ts
  ),
  agg AS (
    SELECT e.user_id, SUM(e.points) AS score
    FROM public.arena_events e, bounds b
    WHERE e.challenge_id = v_cid
      AND e.occurred_at >= b.start_ts
      AND e.occurred_at <  b.end_ts
    GROUP BY e.user_id
    ORDER BY SUM(e.points) DESC
    LIMIT p_limit
  ),
  ranked AS (
    SELECT user_id, score, ROW_NUMBER() OVER (ORDER BY score DESC, user_id) AS rk
    FROM agg
  )
  -- replace that slice (deterministic)
  DELETE FROM public.arena_leaderboard_rollups r
  WHERE r.challenge_id = v_cid
    AND r.section = p_section
    AND r.year = p_year
    AND r.month = p_month;

  INSERT INTO public.arena_leaderboard_rollups (challenge_id, section, year, month, rank, user_id, score)
  SELECT v_cid, p_section, p_year, p_month, rk, user_id, score
  FROM ranked;

  RAISE NOTICE 'Rollups recomputed: %, %, %/%', v_cid, p_section, p_year, p_month;
END
$$;

-- Hardening: least privilege + owner
REVOKE ALL ON FUNCTION public.arena_recompute_rollups_monthly(uuid,text,int,int,int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.arena_recompute_rollups_monthly(uuid,text,int,int,int) TO authenticated;
ALTER FUNCTION public.arena_recompute_rollups_monthly(uuid,text,int,int,int) OWNER TO postgres;