-- CRITICAL: Lock down function execute permissions
-- Currently all 190+ functions are executable by PUBLIC (major security risk)

-- Revoke execute from PUBLIC on all functions
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- Grant execute only to authenticated and service_role
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Note: If you need specific functions callable by anon users, 
-- grant them individually like: GRANT EXECUTE ON FUNCTION public.specific_function() TO anon;