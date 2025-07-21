
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface SupplementEntry {
  name: string;
  dosage: number;
  unit: string;
  created_at: string;
}

interface DailySupplementData {
  date: string;
  count: number;
  supplements: SupplementEntry[];
}

interface UseRealSupplementDataReturn {
  todayCount: number;
  todaySupplements: SupplementEntry[];
  weeklyData: DailySupplementData[];
  monthlyData: DailySupplementData[];
  isLoading: boolean;
  error: string | null;
}

export const useRealSupplementData = (timeframe: '7d' | '30d' = '7d'): UseRealSupplementDataReturn => {
  const { user } = useAuth();
  const [data, setData] = useState<UseRealSupplementDataReturn>({
    todayCount: 0,
    todaySupplements: [],
    weeklyData: [],
    monthlyData: [],
    isLoading: true,
    error: null
  });

  useEffect(() => {
    if (!user?.id) return;

    const fetchSupplementData = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));

        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

        // Get timeframe boundaries
        const daysAgo = timeframe === '7d' ? 7 : 30;
        const timeframeStart = new Date();
        timeframeStart.setDate(timeframeStart.getDate() - daysAgo);
        timeframeStart.setHours(0, 0, 0, 0);

        // Fetch today's supplements
        const { data: todaySupplements, error: todayError } = await supabase
          .from('supplement_logs')
          .select('name, dosage, unit, created_at')
          .eq('user_id', user.id)
          .gte('created_at', startOfToday)
          .lt('created_at', endOfToday)
          .order('created_at', { ascending: false });

        if (todayError) throw todayError;

        // Fetch timeframe supplements
        const { data: timeframeSupplements, error: timeframeError } = await supabase
          .from('supplement_logs')
          .select('name, dosage, unit, created_at')
          .eq('user_id', user.id)
          .gte('created_at', timeframeStart.toISOString())
          .order('created_at', { ascending: false });

        if (timeframeError) throw timeframeError;

        // Group supplements by date
        const groupedByDate = (timeframeSupplements || []).reduce((acc, supplement) => {
          const date = new Date(supplement.created_at).toDateString();
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(supplement);
          return acc;
        }, {} as Record<string, SupplementEntry[]>);

        // Create daily data array
        const dailyData: DailySupplementData[] = [];
        for (let i = daysAgo - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateString = date.toDateString();
          const daySupplements = groupedByDate[dateString] || [];
          
          dailyData.push({
            date: dateString,
            count: daySupplements.length,
            supplements: daySupplements
          });
        }

        setData({
          todayCount: todaySupplements?.length || 0,
          todaySupplements: todaySupplements || [],
          weeklyData: timeframe === '7d' ? dailyData : dailyData.slice(-7),
          monthlyData: timeframe === '30d' ? dailyData : [],
          isLoading: false,
          error: null
        });

      } catch (error) {
        console.error('Error fetching supplement data:', error);
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch supplement data'
        }));
      }
    };

    fetchSupplementData();
  }, [user?.id, timeframe]);

  return data;
};
