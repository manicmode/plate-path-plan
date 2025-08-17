BEGIN;

-- 1) Ensure-or-create an active Rank-of-20 for the current month
CREATE OR REPLACE FUNCTION public.arena_ensure_active_challenge()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_id uuid;
  v_start date := date_trunc('month', now())::date;
  v_end   date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
BEGIN
  -- Prefer any explicitly active one
  SELECT pc.id INTO v_id
  FROM private_challenges pc
  WHERE pc.challenge_type = 'rank_of_20'
    AND pc.status = 'active'
  ORDER BY pc.created_at DESC
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  -- Else reuse a current-month row; flip to active
  SELECT pc.id INTO v_id
  FROM private_challenges pc
  WHERE pc.challenge_type = 'rank_of_20'
    AND pc.start_date <= v_end
    AND (pc.start_date + (pc.duration_days || ' days')::interval) > v_start
  ORDER BY pc.created_at DESC
  LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE private_challenges SET status = 'active' WHERE id = v_id;
    RETURN v_id;
  END IF;

  -- Else create a new one (minimal columns; adjust if your schema requires more)
  INSERT INTO private_challenges (title, challenge_type, status, start_date, duration_days)
  VALUES (
    'Live Rankings Arena ' || to_char(now(), 'YYYY-MM'),
    'rank_of_20',
    'active',
    v_start,
    (v_end - v_start) + 1
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- 2) Make get_active always return exactly one by calling ensure_*
CREATE OR REPLACE FUNCTION public.arena_get_active_challenge()
RETURNS TABLE(
  id uuid,
  slug text,
  title text,
  season integer,
  year integer,
  month integer,
  start_date date,
  end_date date
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH a AS (SELECT public.arena_ensure_active_challenge() AS id)
  SELECT 
    pc.id,
    'arena-' || to_char(now(), 'YYYY') AS slug,
    pc.title,
    1 AS season,
    EXTRACT(YEAR FROM CURRENT_DATE)::int AS year,
    EXTRACT(MONTH FROM CURRENT_DATE)::int AS month,
    pc.start_date,
    (pc.start_date + (pc.duration_days || ' days')::interval - interval '1 day')::date AS end_date
  FROM private_challenges pc
  JOIN a ON a.id = pc.id
  LIMIT 1;
$$;

-- 3) Grants (read-only RPCs can be public)
GRANT EXECUTE ON FUNCTION public.arena_ensure_active_challenge() TO authenticated;  -- optional to anon if you like
GRANT EXECUTE ON FUNCTION public.arena_get_active_challenge() TO anon, authenticated;

COMMIT;