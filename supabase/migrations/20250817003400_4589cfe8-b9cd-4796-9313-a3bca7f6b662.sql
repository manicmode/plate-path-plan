-- Add lookup index for user friends (helps big lists & badges)
CREATE INDEX IF NOT EXISTS idx_user_friends_accepted
ON public.user_friends (user_id, status, friend_id);