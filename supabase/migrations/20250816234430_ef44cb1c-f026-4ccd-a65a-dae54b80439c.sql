-- Friend Overtake Notifications System

-- 1) Throttle table: remember last notify per (user, friend, month)
CREATE TABLE IF NOT EXISTS public.arena_friend_overtake_notifs (
  user_id  uuid NOT NULL,
  friend_id uuid NOT NULL,
  year     int  NOT NULL,
  month    int  NOT NULL,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_overtake_user_month
  ON public.arena_friend_overtake_notifs (user_id, year, month, last_sent_at DESC);

-- 2) RPC: emit "friend passed you" notifications for current slice
CREATE OR REPLACE FUNCTION public.arena_notify_friend_overtakes(
  p_challenge_id  uuid DEFAULT NULL,
  p_section       text DEFAULT 'global',
  p_year          int  DEFAULT date_part('year', now())::int,
  p_month         int  DEFAULT date_part('month', now())::int,
  p_top_cutoff    int  DEFAULT 200,     -- only consider top N
  p_cooldown_hours int DEFAULT 12       -- per-pair cooldown
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_cid uuid;
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
    RAISE NOTICE 'No active arena challenge; skipping friend-overtake notif.';
    RETURN;
  END IF;

  WITH ranks AS (
    SELECT user_id, rank
    FROM public.arena_leaderboard_rollups
    WHERE challenge_id = v_cid
      AND section = p_section
      AND year = p_year
      AND month = p_month
      AND rank <= p_top_cutoff
  ),
  friend_edges AS (
    -- directional both ways; status='accepted'
    SELECT DISTINCT user_id, friend_id
    FROM public.user_friends WHERE status='accepted'
    UNION
    SELECT DISTINCT friend_id AS user_id, user_id AS friend_id
    FROM public.user_friends WHERE status='accepted'
  ),
  pairs AS (
    SELECT fe.user_id AS me, fe.friend_id AS pal,
           me.rank AS my_rank, fr.rank AS friend_rank
    FROM friend_edges fe
    JOIN ranks me ON me.user_id = fe.user_id
    JOIN ranks fr ON fr.user_id = fe.friend_id
    WHERE fr.rank < me.rank        -- friend is ahead
  ),
  cooled AS (
    SELECT p.*
    FROM pairs p
    LEFT JOIN public.arena_friend_overtake_notifs t
      ON t.user_id = p.me
     AND t.friend_id = p.pal
     AND t.year = p_year
     AND t.month = p_month
    WHERE t.last_sent_at IS NULL
       OR t.last_sent_at < now() - (p_cooldown_hours || ' hours')::interval
  ),
  ins AS (
    INSERT INTO public.app_notifications (id, user_id, kind, title, body, meta)
    SELECT
      gen_random_uuid(),
      c.me,
      'arena.friend_passed_you',
      'Your friend just passed you!',
      FORMAT('They are now rank %s; you are rank %s.', c.friend_rank, c.my_rank),
      jsonb_build_object(
        'friend_id',  c.pal,
        'friend_rank', c.friend_rank,
        'my_rank',     c.my_rank,
        'challenge_id', v_cid,
        'section',      p_section,
        'year',         p_year,
        'month',        p_month
      )
    FROM cooled c
    RETURNING user_id, (meta->>'friend_id')::uuid AS friend_id
  )
  INSERT INTO public.arena_friend_overtake_notifs (user_id, friend_id, year, month, last_sent_at)
  SELECT i.user_id, i.friend_id, p_year, p_month, now()
  FROM ins i
  ON CONFLICT (user_id, friend_id, year, month)
  DO UPDATE SET last_sent_at = EXCLUDED.last_sent_at;

  RAISE NOTICE 'Friend-overtake notifications emitted where applicable.';
END
$$;

REVOKE ALL ON FUNCTION public.arena_notify_friend_overtakes(uuid,text,int,int,int,int) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.arena_notify_friend_overtakes(uuid,text,int,int,int,int) TO authenticated;
ALTER FUNCTION public.arena_notify_friend_overtakes(uuid,text,int,int,int,int) OWNER TO postgres;

-- 3) (Optional) Cron: run a bit after the nightly recompute
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.schedule(
      'arena_friend_overtake_nightly',
      '20 0 * * *',
      'SELECT public.arena_notify_friend_overtakes(NULL, ''global'');'
    );
  ELSE
    RAISE NOTICE 'pg_cron not installed; skipping friend overtake schedule.';
  END IF;
END $$;