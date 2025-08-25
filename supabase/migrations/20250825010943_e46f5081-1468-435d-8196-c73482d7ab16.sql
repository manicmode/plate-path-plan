-- Lock it down (idempotent)
REVOKE EXECUTE ON FUNCTION public.get_active_challenge_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.award_points_secure(text,int,numeric) FROM PUBLIC, anon;

-- Allow app users + backend
GRANT EXECUTE ON FUNCTION public.get_active_challenge_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_points_secure(text,int,numeric) TO authenticated, service_role;