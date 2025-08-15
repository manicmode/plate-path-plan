-- 1) Lock down shims AND canonical RPCs
REVOKE ALL ON FUNCTION public.rank20_leaderboard()            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rank20_membership()              FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.rank20_chosen_challenge_id()     FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.my_rank20_leaderboard()          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ensure_rank20_membership()       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_rank20_chosen_challenge_id()  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.arena_post_message(text)         FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.rank20_leaderboard(),
                         public.rank20_membership(),
                         public.rank20_chosen_challenge_id(),
                         public.my_rank20_leaderboard(),
                         public.ensure_rank20_membership(),
                         public.my_rank20_chosen_challenge_id(),
                         public.arena_post_message(text)
TO authenticated, service_role;

-- 2) Prevent future surprises (default privileges for new functions by postgres)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT  EXECUTE ON FUNCTIONS TO authenticated, service_role;

-- 3) Make sure new shims are owned by postgres (matches other RPCs)
ALTER FUNCTION public.rank20_leaderboard()           OWNER TO postgres;
ALTER FUNCTION public.rank20_membership()            OWNER TO postgres;
ALTER FUNCTION public.rank20_chosen_challenge_id()   OWNER TO postgres;

-- 4) Verify permissions (should be: anon=false, public=false, authenticated=true)
SELECT p.proname,
       has_function_privilege('anon','public.'||p.proname||coalesce(pg_get_function_identity_arguments(p.oid),'()'),'EXECUTE')  AS anon_can_exec,
       has_function_privilege('public','public.'||p.proname||coalesce(pg_get_function_identity_arguments(p.oid),'()'),'EXECUTE') AS public_can_exec,
       has_function_privilege('authenticated','public.'||p.proname||coalesce(pg_get_function_identity_arguments(p.oid),'()'),'EXECUTE') AS auth_can_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('rank20_leaderboard','rank20_membership','rank20_chosen_challenge_id',
                    'my_rank20_leaderboard','ensure_rank20_membership','my_rank20_chosen_challenge_id',
                    'arena_post_message')
ORDER BY p.proname;