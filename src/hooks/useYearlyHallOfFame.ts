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
      // First try to fetch from the hall of fame table
      const { data: hallOfFameData, error: hallOfFameError } = await supabase
        .from('yearly_hall_of_fame')
        .select('*')
        .eq('year', targetYear)
        .order('rank_position', { ascending: true })
        .limit(limit);

      if (hallOfFameError) {
        console.warn('Error fetching from hall_of_fame table:', hallOfFameError);
      }

      // If we have data from the hall of fame table, return it
      if (hallOfFameData && hallOfFameData.length > 0) {
        return hallOfFameData;
      }

      // Fallback: Generate live data using the function
      console.log('No cached hall of fame data found, generating live data...');
      
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
      const { data, error } = await supabase
        .from('yearly_hall_of_fame')
        .select('year')
        .order('year', { ascending: false });

      if (error) {
        console.error('Error fetching available years:', error);
        return [new Date().getFullYear()]; // Fallback to current year
      }

      const years = [...new Set(data?.map(item => item.year) || [])];
      
      // Always include current year even if no data exists yet
      const currentYear = new Date().getFullYear();
      if (!years.includes(currentYear)) {
        years.unshift(currentYear);
      }

      return years;
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

      // First try hall of fame table
      const { data: hallOfFameData, error: hallOfFameError } = await supabase
        .from('yearly_hall_of_fame')
        .select('*')
        .eq('year', targetYear)
        .eq('user_id', userId)
        .single();

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