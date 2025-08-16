-- ================================
-- Arena Notifications: Full Setup
-- ================================

-- 1) Notifications table + RLS
CREATE TABLE IF NOT EXISTS public.app_notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  kind       text NOT NULL,               -- e.g. 'arena.rank_up', 'arena.rank_down', 'arena.friend_passed_you'
  title      text NOT NULL,
  body       text,
  meta       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at    timestamptz
);

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='app_notifications' AND policyname='p_app_notifs_select_mine'
  ) THEN
    CREATE POLICY p_app_notifs_select_mine
    ON public.app_notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;

-- Helpful index: "my recent notifications"
CREATE INDEX IF NOT EXISTS idx_app_notifs_user_created
  ON public.app_notifications (user_id, created_at DESC);

-- 2) Secure notifier (insert-only) RPC
CREATE OR REPLACE FUNCTION public.app_notify(
  p_user_id uuid,
  p_kind text,
  p_title text,
  p_body  text DEFAULT NULL,
  p_meta  jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.app_notifications (user_id, kind, title, body, meta)
  VALUES (p_user_id, p_kind, p_title, p_body, p_meta);
$$;

REVOKE ALL ON FUNCTION public.app_notify(uuid,text,text,text,jsonb) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.app_notify(uuid,text,text,text,jsonb) TO authenticated;
ALTER FUNCTION public.app_notify(uuid,text,text,text,jsonb) OWNER TO postgres;

-- 3) Rollups history (tracks last known rank/score for diffing)
CREATE TABLE IF NOT EXISTS public.arena_rollups_hist (
  challenge_id uuid NOT NULL,
  section      text NOT NULL,
  year         int  NOT NULL,
  month        int  NOT NULL,
  user_id      uuid NOT NULL,
  rank         int  NOT NULL,
  score        numeric NOT NULL,
  PRIMARY KEY (challenge_id, section, year, month, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ar_hist_slice
  ON public.arena_rollups_hist (section, year, month, rank);

-- 4) Wrapper recompute WITH notifications (rank up/down/new) for top 200
CREATE OR REPLACE FUNCTION public.arena_recompute_rollups_with_notifications(
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
  -- Resolve active challenge
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

  -- Compute month slice
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
  ),
  old_hist AS (
    SELECT * FROM public.arena_rollups_hist
    WHERE challenge_id = v_cid
      AND section = p_section
      AND year = p_year
      AND month = p_month
  )
  -- Replace the slice deterministically
  DELETE FROM public.arena_leaderboard_rollups r
  WHERE r.challenge_id = v_cid
    AND r.section = p_section
    AND r.year = p_year
    AND r.month = p_month;

  INSERT INTO public.arena_leaderboard_rollups (challenge_id, section, year, month, rank, user_id, score)
  SELECT v_cid, p_section, p_year, p_month, rk, user_id, score
  FROM ranked;

  -- Diff vs history → notify top 200 on rank change (or new)
  INSERT INTO public.app_notifications (id, user_id, kind, title, body, meta)
  SELECT
    gen_random_uuid(),
    n.user_id,
    CASE WHEN o.rank IS NULL THEN 'arena.rank_new'
         WHEN n.rk < o.rank THEN 'arena.rank_up'
         WHEN n.rk > o.rank THEN 'arena.rank_down'
         ELSE 'arena.rank_same' END,
    CASE WHEN o.rank IS NULL THEN 'You joined the leaderboard!'
         WHEN n.rk < o.rank THEN 'Nice! Your rank improved'
         WHEN n.rk > o.rank THEN 'Heads up: your rank dropped'
         ELSE 'Leaderboard updated' END,
    FORMAT('Rank: %s → %s · Score: %s', COALESCE(o.rank::text,'—'), n.rk::text, n.score::text),
    jsonb_build_object(
      'challenge_id', v_cid,
      'section', p_section,
      'year', p_year,
      'month', p_month,
      'old_rank', o.rank,
      'new_rank', n.rk,
      'score', n.score
    )
  FROM ranked n
  LEFT JOIN old_hist o ON o.user_id = n.user_id
  WHERE (o.rank IS NULL OR n.rk <> o.rank)
    AND n.rk <= 200;

  -- Update history to new snapshot
  DELETE FROM public.arena_rollups_hist h
  WHERE h.challenge_id = v_cid
    AND h.section = p_section
    AND h.year = p_year
    AND h.month = p_month;

  INSERT INTO public.arena_rollups_hist (challenge_id, section, year, month, user_id, rank, score)
  SELECT v_cid, p_section, p_year, p_month, user_id, rk, score
  FROM ranked;

  RAISE NOTICE 'Rollups recomputed + notifications emitted for top slice.';
END
$$;

REVOKE ALL ON FUNCTION public.arena_recompute_rollups_with_notifications(uuid,text,int,int,int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.arena_recompute_rollups_with_notifications(uuid,text,int,int,int) TO authenticated;
ALTER FUNCTION public.arena_recompute_rollups_with_notifications(uuid,text,int,int,int) OWNER TO postgres;

-- 5) Realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname='supabase_realtime'
      AND schemaname='public'
      AND tablename='app_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;
  ELSE
    RAISE NOTICE 'app_notifications already in supabase_realtime; skipping.';
  END IF;
END $$;

-- 6) (Optional) Cron: nightly recompute with notifications (guarded)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.schedule(
      'arena_rollup_nightly',
      '10 0 * * *',
      'SELECT public.arena_recompute_rollups_with_notifications(NULL, ''global'');'
    );
  ELSE
    RAISE NOTICE 'pg_cron not installed; skipping nightly schedule.';
  END IF;
END $$;