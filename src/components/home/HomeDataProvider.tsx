
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { useDailyScore } from '@/hooks/useDailyScore';
import { useDailyMealAverages } from '@/hooks/useDailyMealAverages';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HomeDataContextType {
  dailyScore: number;
  dailyAverages: any;
  recentLogs: any[];
  loading: boolean;
  error: string | null;
  refreshData: () => void;
}

const HomeDataContext = createContext<HomeDataContextType | undefined>(undefined);

export const useHomeData = () => {
  const context = useContext(HomeDataContext);
  if (!context) {
    throw new Error('useHomeData must be used within HomeDataProvider');
  }
  return context;
};

export const HomeDataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  
  const scores = useDailyScore();
  const averages = useDailyMealAverages();

  const { data: recentLogs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['recent-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      try {
        const { data, error } = await supabase
          .from('nutrition_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error fetching recent logs:', err);
        setError('Failed to load recent activity');
        return [];
      }
    },
    enabled: !!user?.id,
  });

  const loading = scores.loading || averages.loading || logsLoading;

  const refreshData = async () => {
    setError(null);
    await refetchLogs();
  };

  useEffect(() => {
    if (user?.id && !loading) {
      // Data is ready, clear any previous errors
      setError(null);
    }
  }, [user?.id, loading]);

  return (
    <HomeDataContext.Provider
      value={{
        dailyScore: scores.todayScore || 0,
        dailyAverages: averages.todaysAverage,
        recentLogs,
        loading,
        error,
        refreshData,
      }}
    >
      {children}
    </HomeDataContext.Provider>
  );
};
