-- Grant access to the helper function that nutrition leaderboard calls
GRANT EXECUTE ON FUNCTION public._active_rank20_challenge_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public._active_rank20_challenge_id() TO anon;