-- Fix permissions for nutrition leaderboard function
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard_nutrition(int,int) TO postgres;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard_nutrition(int,int) TO anon;
GRANT EXECUTE ON FUNCTION public.my_rank20_leaderboard_nutrition(int,int) TO authenticated;