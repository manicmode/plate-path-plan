-- 1) Back-compat RPC shims (aliases) ---------------------------------------
-- Leaderboard alias: old UI calls `rank20_leaderboard`, canon is `my_rank20_leaderboard`
CREATE OR REPLACE FUNCTION public.rank20_leaderboard()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  points integer,
  streak integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT * FROM public.my_rank20_leaderboard();
$$;

REVOKE ALL ON FUNCTION public.rank20_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rank20_leaderboard() TO authenticated, service_role;

-- Membership alias: old UI sometimes calls `rank20_membership`
CREATE OR REPLACE FUNCTION public.rank20_membership()
RETURNS TABLE(group_id uuid, challenge_id uuid)
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT * FROM public.ensure_rank20_membership();
$$;

REVOKE ALL ON FUNCTION public.rank20_membership() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rank20_membership() TO authenticated, service_role;

-- Challenge resolver alias: if UI used an older name
CREATE OR REPLACE FUNCTION public.rank20_chosen_challenge_id()
RETURNS TABLE(private_challenge_id uuid, member_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT * FROM public.my_rank20_chosen_challenge_id();
$$;

REVOKE ALL ON FUNCTION public.rank20_chosen_challenge_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rank20_chosen_challenge_id() TO authenticated, service_role;

-- 2) Quick sanity: confirm anon cannot exec
SELECT
  p.proname,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('rank20_leaderboard','rank20_membership','rank20_chosen_challenge_id');