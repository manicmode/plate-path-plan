-- Ensure authenticated users can call the RPC
GRANT EXECUTE ON FUNCTION public.arena_get_active_group_id() TO authenticated;