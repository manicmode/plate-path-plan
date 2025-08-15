-- ================
-- 1) Harden function attributes in-place
-- ================

-- Writes -> VOLATILE; read-only helpers -> STABLE
-- Lock search_path to avoid hijacking; remove PUBLIC; grant only what we use.

ALTER FUNCTION public.ensure_rank20_membership()
  VOLATILE SECURITY DEFINER
  SET search_path = pg_catalog, public;
REVOKE ALL ON FUNCTION public.ensure_rank20_membership() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.ensure_rank20_membership() TO authenticated, service_role;

ALTER FUNCTION public.arena_post_message(text)
  VOLATILE SECURITY DEFINER
  SET search_path = pg_catalog, public;
REVOKE ALL ON FUNCTION public.arena_post_message(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.arena_post_message(text) TO authenticated, service_role;

ALTER FUNCTION public.my_rank20_chosen_challenge_id()
  STABLE  SECURITY DEFINER
  SET search_path = pg_catalog, public;
REVOKE ALL ON FUNCTION public.my_rank20_chosen_challenge_id() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.my_rank20_chosen_challenge_id() TO authenticated, service_role;

-- If these exist in your project, harden them too
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='my_rank20_members') THEN
    EXECUTE 'ALTER FUNCTION public.my_rank20_members() STABLE SECURITY DEFINER SET search_path = pg_catalog, public';
    EXECUTE 'REVOKE ALL ON FUNCTION public.my_rank20_members() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.my_rank20_members() TO authenticated, service_role';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
             WHERE n.nspname='public' AND p.proname='my_rank20_leaderboard') THEN
    EXECUTE 'ALTER FUNCTION public.my_rank20_leaderboard() STABLE SECURITY DEFINER SET search_path = pg_catalog, public';
    EXECUTE 'REVOKE ALL ON FUNCTION public.my_rank20_leaderboard() FROM PUBLIC';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard() TO authenticated, service_role';
  END IF;
END $$;

-- ================
-- 2) Remove/secure the deprecated leaderboard VIEW (views don't support RLS)
--    If the app now calls my_rank20_leaderboard(), it's safe to drop the view.
-- ================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname='public' AND viewname='arena_leaderboard_view') THEN
    -- Option A (preferred): drop it to silence view warnings completely
    EXECUTE 'DROP VIEW public.arena_leaderboard_view';

    -- Option B (keep it but secure) – comment A and uncomment B if you still need the view:
    -- EXECUTE 'REVOKE ALL ON TABLE public.arena_leaderboard_view FROM PUBLIC';
    -- EXECUTE 'GRANT SELECT ON TABLE public.arena_leaderboard_view TO authenticated';
    -- NOTE: Views still bypass RLS; prefer SECURITY DEFINER functions instead.
  END IF;
END $$;

-- ================
-- 3) (Optional) Add FK guard so future groups can't point at missing challenges
-- ================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='fk_rank20_groups_challenge') THEN
    ALTER TABLE public.rank20_groups
      ADD CONSTRAINT fk_rank20_groups_challenge
      FOREIGN KEY (challenge_id)
      REFERENCES public.private_challenges(id)
      ON DELETE SET NULL
      NOT VALID;
    ALTER TABLE public.rank20_groups
      VALIDATE CONSTRAINT fk_rank20_groups_challenge;
  END IF;
END $$;

-- ================
-- 4) Quick verification snapshot
-- ================
SELECT
  p.proname,
  p.provolatile   AS volatility,
  p.prosecdef     AS is_security_definer,
  p.proconfig     AS config,
  has_function_privilege('public', p.oid, 'EXECUTE')      AS public_can_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('ensure_rank20_membership','arena_post_message','my_rank20_chosen_challenge_id',
                    'my_rank20_members','my_rank20_leaderboard')
ORDER BY p.proname;