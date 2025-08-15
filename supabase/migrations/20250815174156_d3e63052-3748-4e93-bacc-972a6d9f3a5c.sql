-- Revoke dangerous anon access (SECURITY DEFINER RPCs must not be callable by unauthenticated users)
REVOKE EXECUTE ON FUNCTION public.ensure_rank20_membership()            FROM anon;
REVOKE EXECUTE ON FUNCTION public.arena_post_message(text)              FROM anon;
REVOKE EXECUTE ON FUNCTION public.my_rank20_chosen_challenge_id()       FROM anon;

-- Keep tight ownership & intended grants
ALTER FUNCTION public.ensure_rank20_membership()            OWNER TO postgres;
ALTER FUNCTION public.arena_post_message(text)              OWNER TO postgres;
ALTER FUNCTION public.my_rank20_chosen_challenge_id()       OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.ensure_rank20_membership()            TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.arena_post_message(text)              TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.my_rank20_chosen_challenge_id()       TO authenticated, service_role;

-- (Optional safety) Confirm RLS is enabled where expected
ALTER TABLE public.private_challenge_participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank20_chat_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank20_members                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank20_groups                   ENABLE ROW LEVEL SECURITY;

-- Validation queries - Who owns the functions and who can execute them?
SELECT
  p.proname,
  pg_get_userbyid(p.proowner) AS owner,
  p.provolatile,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_can_exec,
  has_function_privilege('anon',          p.oid, 'EXECUTE') AS anon_can_exec
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('ensure_rank20_membership','arena_post_message','my_rank20_chosen_challenge_id');