
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface ChartDataPoint {
  label: string;
  value: number;
  date: string;
}

export const useTrackerHistoricalData = (trackerType: string, viewType: 'DAY' | 'WEEK' | 'MONTH') => {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchData();
  }, [user, trackerType, viewType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      let startDate: Date;
      let chartData: ChartDataPoint[] = [];

      switch (viewType) {
        case 'DAY':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 6); // Last 7 days
          chartData = await fetchDailyData(startDate, now);
          break;
        case 'WEEK':
          startDate = new Date(now);
          startDate.setDate(startDate.getDate() - 27); // Last 4 weeks
          chartData = await fetchWeeklyData(startDate, now);
          break;
        case 'MONTH':
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 11); // Last 12 months
          chartData = await fetchMonthlyData(startDate, now);
          break;
      }

      setData(chartData);
    } catch (err) {
      console.error('Error fetching tracker data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyData = async (startDate: Date, endDate: Date): Promise<ChartDataPoint[]> => {
    if (isNutritionTracker(trackerType)) {
      return fetchNutritionDailyData(startDate, endDate);
    } else if (isToxinTracker(trackerType)) {
      return fetchToxinDailyData(startDate, endDate);
    } else if (trackerType === 'hydration') {
      return fetchHydrationDailyData(startDate, endDate);
    } else if (trackerType === 'supplements') {
      return fetchSupplementDailyData(startDate, endDate);
    }
    return [];
  };

  const fetchWeeklyData = async (startDate: Date, endDate: Date): Promise<ChartDataPoint[]> => {
    const dailyData = await fetchDailyData(startDate, endDate);
    return aggregateDataByWeeks(dailyData);
  };

  const fetchMonthlyData = async (startDate: Date, endDate: Date): Promise<ChartDataPoint[]> => {
    const dailyData = await fetchDailyData(startDate, endDate);
    return aggregateDataByMonths(dailyData);
  };

  const fetchNutritionDailyData = async (startDate: Date, endDate: Date): Promise<ChartDataPoint[]> => {
    const { data: nutritionData, error } = await supabase
      .from('nutrition_logs')
      .select('created_at, calories, protein, carbs, fat, fiber, sodium, sugar')
      .eq('user_id', user!.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    // Group by day and sum values
    const dailyTotals: { [date: string]: number } = {};
    
    nutritionData?.forEach(log => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      const value = getValueFromLog(log, trackerType);
      
      if (!dailyTotals[date]) {
        dailyTotals[date] = 0;
      }
      dailyTotals[date] += value;
    });

    // Create chart data for last 7 days
    const chartData: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      chartData.push({
        label: dayName,
        value: Math.round(dailyTotals[dateString] || 0),
        date: dateString,
      });
    }

    return chartData;
  };

  const fetchToxinDailyData = async (startDate: Date, endDate: Date): Promise<ChartDataPoint[]> => {
    const toxinTypeMap = {
      'Inflammatory.F': 'inflammatory_foods',
      'Artificial.S': 'artificial_sweeteners',
      'Preservatives': 'preservatives',
      'Dyes': 'dyes',
      'Seed Oils': 'seed_oils',
      'GMOs': 'gmos',
    };

    const toxinKey = toxinTypeMap[trackerType as keyof typeof toxinTypeMap];
    if (!toxinKey) return [];

    const { data: toxinData, error } = await supabase
      .from('toxin_detections')
      .select('created_at, serving_count')
      .eq('user_id', user!.id)
      .eq('toxin_type', toxinKey)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    // Group by day and sum servings
    const dailyTotals: { [date: string]: number } = {};
    
    toxinData?.forEach(detection => {
      const date = new Date(detection.created_at).toISOString().split('T')[0];
      if (!dailyTotals[date]) {
        dailyTotals[date] = 0;
      }
      dailyTotals[date] += Number(detection.serving_count);
    });

    // Create chart data for last 7 days
    const chartData: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      chartData.push({
        label: dayName,
        value: dailyTotals[dateString] || 0,
        date: dateString,
      });
    }

    return chartData;
  };

  const fetchHydrationDailyData = async (startDate: Date, endDate: Date): Promise<ChartDataPoint[]> => {
    const { data: hydrationData, error } = await supabase
      .from('hydration_logs')
      .select('created_at, volume')
      .eq('user_id', user!.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    // Group by day and sum volume
    const dailyTotals: { [date: string]: number } = {};
    
    hydrationData?.forEach(log => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!dailyTotals[date]) {
        dailyTotals[date] = 0;
      }
      dailyTotals[date] += log.volume;
    });

    // Create chart data for last 7 days
    const chartData: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      chartData.push({
        label: dayName,
        value: dailyTotals[dateString] || 0,
        date: dateString,
      });
    }

    return chartData;
  };

  const fetchSupplementDailyData = async (startDate: Date, endDate: Date): Promise<ChartDataPoint[]> => {
    const { data: supplementData, error } = await supabase
      .from('supplement_logs')
      .select('created_at')
      .eq('user_id', user!.id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    // Group by day and count supplements
    const dailyTotals: { [date: string]: number } = {};
    
    supplementData?.forEach(log => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!dailyTotals[date]) {
        dailyTotals[date] = 0;
      }
      dailyTotals[date] += 1;
    });

    // Create chart data for last 7 days
    const chartData: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      chartData.push({
        label: dayName,
        value: dailyTotals[dateString] || 0,
        date: dateString,
      });
    }

    return chartData;
  };

  const aggregateDataByWeeks = (dailyData: ChartDataPoint[]): ChartDataPoint[] => {
    const weeklyData: ChartDataPoint[] = [];
    const weeksToShow = 4;
    
    for (let weekIndex = 0; weekIndex < weeksToShow; weekIndex++) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (weekIndex * 7) - 6);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (weekIndex * 7));
      
      const weekData = dailyData.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= weekStart && itemDate <= weekEnd;
      });
      
      const average = weekData.length > 0 
        ? Math.round(weekData.reduce((sum, item) => sum + item.value, 0) / weekData.length)
        : 0;
      
      weeklyData.unshift({
        label: `Week ${weeksToShow - weekIndex}`,
        value: average,
        date: weekStart.toISOString().split('T')[0],
      });
    }
    
    return weeklyData;
  };

  const aggregateDataByMonths = (dailyData: ChartDataPoint[]): ChartDataPoint[] => {
    const monthlyData: { [month: string]: { values: number[], label: string } } = {};
    
    dailyData.forEach(item => {
      const date = new Date(item.date);
      const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { values: [], label: monthLabel };
      }
      monthlyData[monthKey].values.push(item.value);
    });
    
    return Object.entries(monthlyData)
      .map(([monthKey, data]) => ({
        label: data.label,
        value: data.values.length > 0 
          ? Math.round(data.values.reduce((sum, val) => sum + val, 0) / data.values.length)
          : 0,
        date: monthKey + '-01',
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12); // Show last 12 months
  };

  const getValueFromLog = (log: any, tracker: string): number => {
    switch (tracker) {
      case 'calories': return log.calories || 0;
      case 'protein': return log.protein || 0;
      case 'carbs': return log.carbs || 0;
      case 'fat': return log.fat || 0;
      case 'fiber': return log.fiber || 0;
      default: return 0;
    }
  };

  const isNutritionTracker = (tracker: string): boolean => {
    return ['calories', 'protein', 'carbs', 'fat', 'fiber'].includes(tracker);
  };

  const isToxinTracker = (tracker: string): boolean => {
    return ['Inflammatory.F', 'Artificial.S', 'Preservatives', 'Dyes', 'Seed Oils', 'GMOs'].includes(tracker);
  };

  return { data, loading, error, refetch: fetchData };
};
