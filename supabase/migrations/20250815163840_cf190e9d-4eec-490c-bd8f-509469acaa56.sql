-- Re-apply proper permissions to arena_post_message function
REVOKE ALL ON FUNCTION public.arena_post_message(text) FROM public;
GRANT EXECUTE ON FUNCTION public.arena_post_message(text) TO authenticated, service_role;