-- Security hardening for my_rank20_leaderboard function
ALTER FUNCTION public.my_rank20_leaderboard() STABLE;

-- Ensure proper permissions (remove PUBLIC, grant to authenticated)
REVOKE ALL ON FUNCTION public.my_rank20_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard() TO authenticated, service_role;

-- Performance indexes (create if missing)
CREATE INDEX IF NOT EXISTS idx_rank20_members_group_user 
ON public.rank20_members (group_id, user_id);

CREATE INDEX IF NOT EXISTS idx_rank20_groups_challenge 
ON public.rank20_groups (challenge_id);

CREATE INDEX IF NOT EXISTS idx_rank20_chat_messages_challenge_created 
ON public.rank20_chat_messages (challenge_id, created_at DESC);