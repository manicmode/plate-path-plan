-- Add index to optimize rate limiting query in send_friend_request
-- Helps WHERE user_id = ? AND status = 'pending' AND created_at > now() - interval '24 hours'
CREATE INDEX IF NOT EXISTS idx_user_friends_rate_limit
ON public.user_friends (user_id, status, created_at DESC);