-- 0) Safety: prevent duplicate memberships (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pcp_user_challenge
  ON public.private_challenge_participations (user_id, private_challenge_id);

-- 1) Get the current Rank-of-20 challenge (latest 'active'; fallback to latest created)
CREATE OR REPLACE FUNCTION public.current_rank20_challenge_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  WITH active AS (
    SELECT id
    FROM public.private_challenges
    WHERE challenge_type = 'rank_of_20'
      AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  )
  SELECT COALESCE(
    (SELECT id FROM active),
    (SELECT id FROM public.private_challenges
       WHERE challenge_type = 'rank_of_20'
       ORDER BY created_at DESC LIMIT 1)
  );
$$;

-- 2) Enroll any user (by id) into current Rank-of-20, no-op if already enrolled
CREATE OR REPLACE FUNCTION public.rank20_enroll_user(_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  rid uuid;
BEGIN
  SELECT public.current_rank20_challenge_id() INTO rid;
  IF rid IS NULL THEN
    -- No rank_of_20 challenge exists; nothing to do
    RETURN;
  END IF;

  INSERT INTO public.private_challenge_participations
    (id, private_challenge_id, user_id, joined_at, is_creator)
  VALUES
    (gen_random_uuid(), rid, _user, now(), false)
  ON CONFLICT (user_id, private_challenge_id) DO NOTHING;
END;
$$;

-- 3) Convenience RPC for clients to call (joins the *current user*)
CREATE OR REPLACE FUNCTION public.rank20_enroll_me()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT public.rank20_enroll_user(auth.uid());
$$;

-- 4) Auto-enroll users when they confirm email
--    (fires when email_confirmed_at flips from NULL -> NOT NULL)
CREATE OR REPLACE FUNCTION public._on_user_confirm_rank20()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  PERFORM public.rank20_enroll_user(new.id);
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_rank20_auto_enroll_confirm ON auth.users;
CREATE TRIGGER trg_rank20_auto_enroll_confirm
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (old.email_confirmed_at IS NULL AND new.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public._on_user_confirm_rank20();

-- Also handle the rare case a user is inserted already-confirmed (SSO, manual import)
DROP TRIGGER IF EXISTS trg_rank20_auto_enroll_insert ON auth.users;
CREATE TRIGGER trg_rank20_auto_enroll_insert
AFTER INSERT ON auth.users
FOR EACH ROW
WHEN (new.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public._on_user_confirm_rank20();

-- Backfill: Enroll all currently confirmed users who aren't enrolled yet
DO $$
DECLARE
  rid uuid;
BEGIN
  SELECT public.current_rank20_challenge_id() INTO rid;
  IF rid IS NULL THEN RETURN; END IF;

  INSERT INTO public.private_challenge_participations (id, private_challenge_id, user_id, joined_at, is_creator)
  SELECT gen_random_uuid(), rid, u.id, now(), false
  FROM auth.users u
  LEFT JOIN public.private_challenge_participations p
    ON p.user_id = u.id AND p.private_challenge_id = rid
  WHERE u.email_confirmed_at IS NOT NULL
    AND p.user_id IS NULL;
END $$;