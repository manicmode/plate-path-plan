-- A) Winners archive table
CREATE TABLE IF NOT EXISTS public.arena_monthly_winners (
  id           bigserial PRIMARY KEY,
  season_month date        NOT NULL,  -- e.g., 2025-08-01 (first day of month)
  user_id      uuid        NOT NULL,
  rank         int         NOT NULL,
  score        numeric     NOT NULL,
  trophy_level text        NOT NULL CHECK (trophy_level IN ('gold','silver','bronze')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_arena_winners_month ON public.arena_monthly_winners (season_month);
CREATE INDEX IF NOT EXISTS idx_arena_winners_user  ON public.arena_monthly_winners (user_id);

-- Enable RLS on the winners table
ALTER TABLE public.arena_monthly_winners ENABLE ROW LEVEL SECURITY;

-- RLS policies for arena monthly winners
CREATE POLICY "Anyone can view arena monthly winners" 
ON public.arena_monthly_winners 
FOR SELECT 
USING (true);

CREATE POLICY "System can create arena monthly winners" 
ON public.arena_monthly_winners 
FOR INSERT 
WITH CHECK (true);

-- B) Close previous month, snapshot podium with dense ties, and notify winners
CREATE OR REPLACE FUNCTION public.arena_close_previous_month()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  prev_month date := (date_trunc('month', now()) - interval '1 month')::date;
BEGIN
  WITH month_scores AS (
    SELECT
      ar.user_id,
      ar.score::numeric AS score,
      DENSE_RANK() OVER (ORDER BY ar.score DESC) AS rnk
    FROM public.arena_leaderboard_rollups ar
    WHERE ar.year  = EXTRACT(YEAR  FROM prev_month)::int
      AND ar.month = EXTRACT(MONTH FROM prev_month)::int
      AND ar.section = 'global'
  ),
  winners AS (
    SELECT
      CASE
        WHEN rnk = 1 THEN 'gold'
        WHEN rnk = 2 THEN 'silver'
        WHEN rnk = 3 THEN 'bronze'
      END::text AS trophy_level,
      user_id,
      rnk        AS rank,
      score
    FROM month_scores
    WHERE rnk <= 3
  )
  INSERT INTO public.arena_monthly_winners (season_month, user_id, rank, score, trophy_level)
  SELECT prev_month, user_id, rank, score, trophy_level
  FROM winners
  ON CONFLICT DO NOTHING;

  -- Notify winners (uses existing app_notify wrapper)
  PERFORM public.app_notify(
    w.user_id,
    'arena_trophy_awarded',
    '🏆 Arena Trophy Awarded',
    CASE w.trophy_level
      WHEN 'gold'   THEN 'You won GOLD for last month!'
      WHEN 'silver' THEN 'You won SILVER for last month!'
      WHEN 'bronze' THEN 'You won BRONZE for last month!'
    END,
    jsonb_build_object(
      'season_month', w.season_month,
      'trophy_level', w.trophy_level,
      'rank', w.rank,
      'score', w.score
    )
  )
  FROM public.arena_monthly_winners w
  WHERE w.season_month = prev_month;
END;
$$;

REVOKE ALL ON FUNCTION public.arena_close_previous_month() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.arena_close_previous_month() TO authenticated;

-- C) View for last month's winners (for UI)
CREATE OR REPLACE VIEW public.arena_last_month_winners AS
WITH prev AS (
  SELECT (date_trunc('month', now()) - interval '1 month')::date AS season_month
)
SELECT
  w.season_month,
  w.user_id,
  w.rank,
  w.score,
  w.trophy_level,
  COALESCE(p.first_name || ' ' || p.last_name, '') AS display_name,
  p.avatar_url
FROM public.arena_monthly_winners w
JOIN prev ON w.season_month = prev.season_month
LEFT JOIN public.user_profiles p ON p.user_id = w.user_id
ORDER BY w.rank;

-- D) Cron at 00:05 on the 1st of each month (UTC)
SELECT cron.schedule(
  'arena-close-prev-month',
  '5 0 1 * *',
  $$SELECT public.arena_close_previous_month();$$
);