import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface HydrationEntry {
  id: string;
  name: string;
  volume: number;
  type: string;
  created_at: string;
}

interface DailyHydrationData {
  date: string;
  total_ml: number;
  entries: HydrationEntry[];
}

export const useRealHydrationData = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [todayTotal, setTodayTotal] = useState(0);
  const [weeklyData, setWeeklyData] = useState<DailyHydrationData[]>([]);

  const loadHydrationData = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);

      // Get last 7 days of hydration data
      const { data, error } = await supabase
        .from('hydration_logs')
        .select('id, name, volume, type, created_at')
        .eq('user_id', user.id)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading hydration data:', error);
        setIsLoading(false);
        return;
      }

      // Group data by date
      const groupedData: { [key: string]: HydrationEntry[] } = {};
      const todayString = today.toISOString().split('T')[0];

      data?.forEach((entry) => {
        const entryDate = new Date(entry.created_at).toISOString().split('T')[0];
        if (!groupedData[entryDate]) {
          groupedData[entryDate] = [];
        }
        groupedData[entryDate].push(entry);
      });

      // Create daily data for last 7 days
      const dailyData: DailyHydrationData[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        
        const entries = groupedData[dateString] || [];
        const total_ml = entries.reduce((sum, entry) => sum + entry.volume, 0);
        
        dailyData.push({
          date: dateString,
          total_ml,
          entries
        });
      }

      setWeeklyData(dailyData);
      
      // Set today's total
      const todayData = dailyData.find(d => d.date === todayString);
      setTodayTotal(todayData?.total_ml || 0);

      console.log('Real hydration data loaded:', { dailyData, todayTotal: todayData?.total_ml || 0 });
    } catch (error) {
      console.error('Error in loadHydrationData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHydrationData();
  }, [user?.id]);

  // Format weekly data for charts
  const getWeeklyChartData = () => {
    return weeklyData.map((day, index) => {
      const date = new Date(day.date);
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const isToday = day.date === new Date().toISOString().split('T')[0];
      
      return {
        name: isToday ? 'Today' : dayNames[date.getDay() === 0 ? 6 : date.getDay() - 1],
        value: Math.round(day.total_ml / 250), // Convert ml to glasses (250ml per glass)
        ml: day.total_ml,
        target: 8 // Default 8 glasses target
      };
    });
  };

  const getWeeklyAverage = () => {
    if (weeklyData.length === 0) return 0;
    const totalMl = weeklyData.reduce((sum, day) => sum + day.total_ml, 0);
    return Math.round(totalMl / weeklyData.length);
  };

  return {
    isLoading,
    todayTotal,
    weeklyData,
    weeklyChartData: getWeeklyChartData(),
    weeklyAverage: getWeeklyAverage(),
    refresh: loadHydrationData
  };
};