import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface YearlyHallOfFameUser {
  user_id: string;
  username: string;
  display_name: string;
  year: number;
  yearly_score: number;
  monthly_trophies: number;
  avg_nutrition_streak: number;
  avg_hydration_streak: number;
  avg_supplement_streak: number;
  total_active_days: number;
  total_messages: number;
  rank_position: number;
}

interface UseYearlyHallOfFameOptions {
  enabled?: boolean;
  limit?: number;
}

export const useYearlyHallOfFame = (
  year?: number,
  options: UseYearlyHallOfFameOptions = {}
) => {
  const currentYear = new Date().getFullYear();
  const targetYear = year || currentYear;
  const { enabled = true, limit = 100 } = options;

  return useQuery({
    queryKey: ['yearly-hall-of-fame', targetYear, limit],
    queryFn: async (): Promise<YearlyHallOfFameUser[]> => {
      // First try to fetch from the preview table (most up-to-date)
      const { data: previewData, error: previewError } = await supabase
        .from('yearly_score_preview')
        .select('*')
        .eq('year', targetYear)
        .order('rank_position', { ascending: true })
        .limit(limit);

      if (!previewError && previewData && previewData.length > 0) {
        console.log(`📊 Using preview data for year ${targetYear}: ${previewData.length} records`);
        return previewData;
      }

      // Fallback to hall of fame table (finalized data)
      const { data: hallOfFameData, error: hallOfFameError } = await supabase
        .from('yearly_hall_of_fame')
        .select('*')
        .eq('year', targetYear)
        .order('rank_position', { ascending: true })
        .limit(limit);

      if (!hallOfFameError && hallOfFameData && hallOfFameData.length > 0) {
        console.log(`🏆 Using hall of fame data for year ${targetYear}: ${hallOfFameData.length} records`);
        return hallOfFameData;
      }

      // Final fallback: Generate live data using the function
      console.log(`🔄 Generating live data for year ${targetYear}...`);
      
      const { data: liveData, error: functionError } = await supabase
        .rpc('get_top_100_yearly_users', { target_year: targetYear });

      if (functionError) {
        console.error('Error calling get_top_100_yearly_users:', functionError);
        throw functionError;
      }

      // Transform the function response to match our interface
      const transformedData: YearlyHallOfFameUser[] = (liveData || []).map(user => ({
        ...user,
        year: targetYear,
      }));

      return transformedData;
    },
    enabled,
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 2,
    refetchOnWindowFocus: false,
  });
};

// Hook to get available years
export const useAvailableHallOfFameYears = () => {
  return useQuery({
    queryKey: ['available-hall-of-fame-years'],
    queryFn: async (): Promise<number[]> => {
      // Get years from both preview and finalized tables
      const [previewResult, hallOfFameResult] = await Promise.all([
        supabase.from('yearly_score_preview').select('year').order('year', { ascending: false }),
        supabase.from('yearly_hall_of_fame').select('year').order('year', { ascending: false })
      ]);

      const previewYears = previewResult.data?.map(item => item.year) || [];
      const hallOfFameYears = hallOfFameResult.data?.map(item => item.year) || [];
      
      // Combine and deduplicate years
      const allYears = [...new Set([...previewYears, ...hallOfFameYears])];
      
      // Always include current year even if no data exists yet
      const currentYear = new Date().getFullYear();
      if (!allYears.includes(currentYear)) {
        allYears.unshift(currentYear);
      }

      return allYears.sort((a, b) => b - a); // Sort descending
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  });
};

// Hook to get user's rank for a specific year
export const useUserYearlyRank = (userId: string, year?: number) => {
  const currentYear = new Date().getFullYear();
  const targetYear = year || currentYear;

  return useQuery({
    queryKey: ['user-yearly-rank', userId, targetYear],
    queryFn: async (): Promise<YearlyHallOfFameUser | null> => {
      if (!userId) return null;

      // First try preview table
      const { data: previewData, error: previewError } = await supabase
        .from('yearly_score_preview')
        .select('*')
        .eq('year', targetYear)
        .eq('user_id', userId)
        .maybeSingle();

      if (!previewError && previewData) {
        return previewData;
      }

      // Then try hall of fame table
      const { data: hallOfFameData, error: hallOfFameError } = await supabase
        .from('yearly_hall_of_fame')
        .select('*')
        .eq('year', targetYear)
        .eq('user_id', userId)
        .maybeSingle();

      if (!hallOfFameError && hallOfFameData) {
        return hallOfFameData;
      }

      // Fallback: Get from live function and find user
      const { data: liveData, error: functionError } = await supabase
        .rpc('get_top_100_yearly_users', { target_year: targetYear });

      if (functionError) {
        console.error('Error getting user rank:', functionError);
        return null;
      }

      const userRank = (liveData || []).find(user => user.user_id === userId);
      
      if (userRank) {
        return {
          ...userRank,
          year: targetYear,
        };
      }

      return null;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};