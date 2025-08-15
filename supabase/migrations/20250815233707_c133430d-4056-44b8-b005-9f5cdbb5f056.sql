-- Grant permission and run test, then cleanup
GRANT EXECUTE ON FUNCTION public._arena_join_and_leaderboard(uuid) TO postgres;

-- Test with user
SELECT * FROM public._arena_join_and_leaderboard('f8458f5c-cd73-44ba-a818-6996d23e454b');

-- Clean up
DROP FUNCTION public._arena_join_and_leaderboard(uuid);