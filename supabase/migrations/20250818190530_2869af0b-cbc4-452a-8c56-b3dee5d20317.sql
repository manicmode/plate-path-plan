-- Final hardening tweaks for habit templates security

-- Give the service role basic access (common Supabase gotcha)
GRANT USAGE  ON SCHEMA public TO service_role;
GRANT SELECT ON public.habit_templates TO service_role;
GRANT EXECUTE ON FUNCTION public.secure_upsert_habit_templates(jsonb) TO service_role;

-- Extra belt-and-suspenders cleanup
REVOKE ALL ON public.habit_template FROM PUBLIC;