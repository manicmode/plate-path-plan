-- Security fix: Lock down RPC function to authenticated users only
-- Revoke all permissions from PUBLIC (includes anon)
REVOKE ALL ON FUNCTION public.rpc_upsert_user_profile(jsonb, jsonb, jsonb) FROM PUBLIC;

-- Grant EXECUTE only to authenticated role (users with valid sessions)
GRANT EXECUTE ON FUNCTION public.rpc_upsert_user_profile(jsonb, jsonb, jsonb) TO authenticated;

-- Grant to service_role for backend operations (Edge Functions, etc.)
GRANT EXECUTE ON FUNCTION public.rpc_upsert_user_profile(jsonb, jsonb, jsonb) TO service_role;