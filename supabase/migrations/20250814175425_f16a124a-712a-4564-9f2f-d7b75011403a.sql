-- Restore/harden auto-enroll (idempotent)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pcp_user_challenge
  ON public.private_challenge_participations (user_id, private_challenge_id);

CREATE OR REPLACE FUNCTION public.current_rank20_challenge_id()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
  WITH active AS (
    SELECT id FROM public.private_challenges
    WHERE challenge_type='rank_of_20' AND status='active'
    ORDER BY created_at DESC LIMIT 1
  )
  SELECT COALESCE(
    (SELECT id FROM active),
    (SELECT id FROM public.private_challenges
     WHERE challenge_type='rank_of_20'
     ORDER BY created_at DESC LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.rank20_enroll_user(_user uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE rid uuid;
BEGIN
  SELECT public.current_rank20_challenge_id() INTO rid;
  IF rid IS NULL THEN RETURN; END IF;
  INSERT INTO public.private_challenge_participations
    (id, private_challenge_id, user_id, joined_at, is_creator)
  VALUES (gen_random_uuid(), rid, _user, now(), false)
  ON CONFLICT (user_id, private_challenge_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.rank20_enroll_me()
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
  SELECT public.rank20_enroll_user(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public._on_user_confirm_rank20()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
BEGIN
  PERFORM public.rank20_enroll_user(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rank20_auto_enroll_confirm ON auth.users;
CREATE TRIGGER trg_rank20_auto_enroll_confirm
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW
WHEN (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public._on_user_confirm_rank20();

DROP TRIGGER IF EXISTS trg_rank20_auto_enroll_insert ON auth.users;
CREATE TRIGGER trg_rank20_auto_enroll_insert
AFTER INSERT ON auth.users
FOR EACH ROW
WHEN (NEW.email_confirmed_at IS NOT NULL)
EXECUTE FUNCTION public._on_user_confirm_rank20();

-- Backfill existing users
DO $$
DECLARE rid uuid;
BEGIN
  SELECT public.current_rank20_challenge_id() INTO rid;
  IF rid IS NULL THEN RETURN; END IF;
  INSERT INTO public.private_challenge_participations (id, private_challenge_id, user_id, joined_at, is_creator)
  SELECT gen_random_uuid(), rid, u.id, now(), false
  FROM auth.users u
  LEFT JOIN public.private_challenge_participations p
    ON p.user_id=u.id AND p.private_challenge_id=rid
  WHERE u.email_confirmed_at IS NOT NULL AND p.user_id IS NULL;
END $$;