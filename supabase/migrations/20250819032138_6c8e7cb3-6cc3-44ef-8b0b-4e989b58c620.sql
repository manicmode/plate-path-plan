-- 1) Ensure the owner can run SECURITY DEFINER
ALTER FUNCTION public.rpc_upsert_user_profile(jsonb, jsonb, jsonb)
OWNER TO postgres;

-- 2) Add the doc comment (helps future devs)
COMMENT ON FUNCTION public.rpc_upsert_user_profile(jsonb, jsonb, jsonb)
IS 'Upserts profile prefs for current user; casts jsonb arrays to text[]; relies on auth.uid().';