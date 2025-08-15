-- ---------- SAFETY & RLS ----------
ALTER TABLE public.rank20_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank20_chat_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank20_billboard_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank20_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank20_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_challenge_participations ENABLE ROW LEVEL SECURITY;

-- ---------- INDEXES & UNIQUES ----------
CREATE UNIQUE INDEX IF NOT EXISTS ux_r20_members_user ON public.rank20_members(user_id);
CREATE INDEX        IF NOT EXISTS idx_r20_members_group ON public.rank20_members(group_id);
CREATE INDEX        IF NOT EXISTS idx_r20_groups_open   ON public.rank20_groups(is_closed);
CREATE INDEX        IF NOT EXISTS idx_r20_chat_msgs_chal_created ON public.rank20_chat_messages(challenge_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_pcp_chal_user
  ON public.private_challenge_participations(private_challenge_id, user_id);

-- ---------- CLOSE GROUP AT 20 (TRIGGER) ----------
CREATE OR REPLACE FUNCTION public.r20_close_full_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE member_count int;
BEGIN
  SELECT count(*) INTO member_count FROM public.rank20_members WHERE group_id = NEW.group_id;
  IF member_count >= 20 THEN
    UPDATE public.rank20_groups SET is_closed = true
    WHERE id = NEW.group_id AND COALESCE(is_closed,false) = false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_r20_close_full_group ON public.rank20_members;
CREATE TRIGGER tr_r20_close_full_group
AFTER INSERT ON public.rank20_members
FOR EACH ROW EXECUTE FUNCTION public.r20_close_full_group();

-- ---------- MEMBERSHIP (VOLATILE, SD, ADVISORY LOCK, BACKFILL SAFE) ----------
CREATE OR REPLACE FUNCTION public.ensure_rank20_membership()
RETURNS TABLE(group_id uuid, challenge_id uuid)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_group uuid;
  v_chal  uuid;
  v_lock  bigint;
BEGIN
  -- Per-user advisory lock using JWT sub or auth.uid()
  SELECT hashtextextended(
           COALESCE(current_setting('request.jwt.claim.sub', true),
                    auth.uid()::text,
                    'anon'),
           0
         ) INTO v_lock;
  PERFORM pg_advisory_xact_lock(v_lock);

  -- If already a member, reuse
  SELECT rm.group_id INTO v_group
  FROM public.rank20_members rm
  WHERE rm.user_id = auth.uid()
  LIMIT 1;

  IF v_group IS NOT NULL THEN
    SELECT rg.challenge_id INTO v_chal
    FROM public.rank20_groups rg
    WHERE rg.id = v_group
    FOR UPDATE;

    -- Backfill if NULL or orphaned
    IF v_chal IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.private_challenges pc WHERE pc.id = v_chal
    ) THEN
      INSERT INTO public.private_challenges (
        title, description, challenge_type, creator_id, status, start_date, duration_days, max_participants
      ) VALUES (
        'Rank of 20 Group (Auto Backfill)',
        'Auto-generated private challenge for Rank-of-20 group',
        'rank_of_20',
        auth.uid(),
        'active',
        CURRENT_DATE,
        30,
        20
      ) RETURNING id INTO v_chal;

      UPDATE public.rank20_groups SET challenge_id = v_chal WHERE id = v_group;
    END IF;

  ELSE
    -- Join open group with valid challenge, else create new
    SELECT g.id, g.challenge_id
      INTO v_group, v_chal
    FROM public.rank20_groups g
    JOIN public.private_challenges pc ON pc.id = g.challenge_id
    WHERE COALESCE(g.is_closed,false) = false
      AND (SELECT COUNT(*) FROM public.rank20_members m WHERE m.group_id = g.id) < 20
    ORDER BY (SELECT COUNT(*) FROM public.rank20_members m2 WHERE m2.group_id = g.id) DESC
    FOR UPDATE SKIP LOCKED
    LIMIT 1;

    IF v_group IS NULL THEN
      INSERT INTO public.private_challenges (
        title, description, challenge_type, creator_id, status, start_date, duration_days, max_participants
      ) VALUES (
        'Rank of 20 Group',
        'Automated Rank of 20 challenge group',
        'rank_of_20',
        auth.uid(),
        'active',
        CURRENT_DATE,
        30,
        20
      ) RETURNING id INTO v_chal;

      INSERT INTO public.rank20_groups (challenge_id, is_closed)
      VALUES (v_chal, false)
      RETURNING id INTO v_group;
    END IF;

    INSERT INTO public.rank20_members (user_id, group_id, joined_at)
    VALUES (auth.uid(), v_group, now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Idempotent PCP upsert
  INSERT INTO public.private_challenge_participations (private_challenge_id, user_id, is_creator)
  VALUES (v_chal, auth.uid(), false)
  ON CONFLICT (private_challenge_id, user_id) DO NOTHING;

  RETURN QUERY SELECT v_group, v_chal;
END;
$$;

ALTER FUNCTION public.ensure_rank20_membership() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.ensure_rank20_membership() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.ensure_rank20_membership() TO authenticated, service_role;

-- ---------- MESSAGE RPC (VOLATILE, SD, BODY COLUMN) ----------
CREATE OR REPLACE FUNCTION public.arena_post_message(p_content text)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE v_group uuid; v_chal uuid; v_id uuid;
BEGIN
  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'Message body is empty';
  END IF;

  SELECT group_id, challenge_id INTO v_group, v_chal
  FROM public.ensure_rank20_membership();

  BEGIN
    INSERT INTO public.rank20_chat_messages (challenge_id, user_id, body)
    VALUES (v_chal, auth.uid(), p_content)
    RETURNING id INTO v_id;
    RETURN v_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'arena_post_message failed [%]: %', SQLSTATE, SQLERRM;
  END;
END;
$$;

ALTER FUNCTION public.arena_post_message(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.arena_post_message(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.arena_post_message(text) TO authenticated, service_role;

-- ---------- CHALLENGE RESOLVER (STABLE, SD) ----------
CREATE OR REPLACE FUNCTION public.my_rank20_chosen_challenge_id()
RETURNS TABLE(private_challenge_id uuid, member_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  WITH mg AS (
    SELECT rg.id AS group_id, rg.challenge_id
    FROM public.rank20_members rm
    JOIN public.rank20_groups  rg ON rg.id = rm.group_id
    WHERE rm.user_id = auth.uid()
    LIMIT 1
  )
  SELECT
    mg.challenge_id AS private_challenge_id,
    (SELECT COUNT(*) FROM public.rank20_members m WHERE m.group_id = mg.group_id) AS member_count
  FROM mg;
$$;

ALTER FUNCTION public.my_rank20_chosen_challenge_id() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.my_rank20_chosen_challenge_id() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.my_rank20_chosen_challenge_id() TO authenticated, service_role;

-- ---------- BACK-COMPAT SHIMS ----------
CREATE OR REPLACE FUNCTION public.rank20_membership()
RETURNS TABLE(group_id uuid, challenge_id uuid)
LANGUAGE sql VOLATILE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT * FROM public.ensure_rank20_membership(); $$;
ALTER FUNCTION public.rank20_membership() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rank20_membership() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rank20_membership() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rank20_chosen_challenge_id()
RETURNS TABLE(private_challenge_id uuid, member_count integer)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$ SELECT * FROM public.my_rank20_chosen_challenge_id(); $$;
ALTER FUNCTION public.rank20_chosen_challenge_id() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.rank20_chosen_challenge_id() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rank20_chosen_challenge_id() TO authenticated, service_role;

-- If you have my_rank20_leaderboard() already:
-- (Optional) Forwarder shim for legacy callers
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='my_rank20_leaderboard') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.rank20_leaderboard()
      RETURNS TABLE(user_id uuid, display_name text, avatar_url text, points integer, streak integer)
      LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path = pg_catalog, public
      AS $$ SELECT * FROM public.my_rank20_leaderboard() $$;
    $f$;
    EXECUTE 'ALTER FUNCTION public.rank20_leaderboard() OWNER TO postgres';
    EXECUTE 'REVOKE ALL ON FUNCTION public.rank20_leaderboard() FROM PUBLIC, anon';
    EXECUTE 'GRANT  EXECUTE ON FUNCTION public.rank20_leaderboard() TO authenticated, service_role';
  END IF;
END $$;

-- ---------- CLEANUP INSECURE VIEW & ADD FK GUARD ----------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='arena_leaderboard_view') THEN
    EXECUTE 'DROP VIEW public.arena_leaderboard_view';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_rank20_groups_challenge') THEN
    ALTER TABLE public.rank20_groups
      ADD CONSTRAINT fk_rank20_groups_challenge
      FOREIGN KEY (challenge_id) REFERENCES public.private_challenges(id)
      ON DELETE SET NULL NOT VALID;
    ALTER TABLE public.rank20_groups VALIDATE CONSTRAINT fk_rank20_groups_challenge;
  END IF;
END $$;

-- ---------- DEFAULT PRIVILEGES ----------
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT  EXECUTE ON FUNCTIONS TO authenticated, service_role;