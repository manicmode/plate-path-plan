import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { getLocalDateString, getLocalDayBounds } from '@/lib/dateUtils';
import { calculateTotalMicronutrients } from '@/utils/micronutrientCalculations';

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

      console.log(`📊 Fetching tracker data for ${trackerType} with view ${viewType} using local time`);

      let chartData: ChartDataPoint[] = [];

      switch (viewType) {
        case 'DAY':
          chartData = await fetchDailyData();
          break;
        case 'WEEK':
          chartData = await fetchWeeklyData();
          break;
        case 'MONTH':
          chartData = await fetchMonthlyData();
          break;
      }

      setData(chartData);
    } catch (err) {
      console.error('❌ Error fetching tracker data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDailyData = async (): Promise<ChartDataPoint[]> => {
    if (isNutritionTracker(trackerType)) {
      return fetchNutritionDailyData();
    } else if (isToxinTracker(trackerType)) {
      return fetchToxinDailyData();
    } else if (trackerType === 'hydration') {
      return fetchHydrationDailyData();
    } else if (trackerType === 'supplements') {
      return fetchSupplementDailyData();
    } else if (trackerType === 'steps') {
      return fetchStepsDailyData();
    } else if (trackerType === 'exercise') {
      return fetchExerciseDailyData();
    } else if (['iron', 'magnesium', 'calcium', 'zinc', 'vitaminA', 'vitaminB12', 'vitaminC', 'vitaminD'].includes(trackerType)) {
      return fetchMicronutrientDailyData(trackerType);
    }
    return [];
  };

  const fetchWeeklyData = async (): Promise<ChartDataPoint[]> => {
    const dailyData = await fetchDailyData();
    return aggregateDataByWeeks(dailyData);
  };

  const fetchMonthlyData = async (): Promise<ChartDataPoint[]> => {
    const dailyData = await fetchDailyData();
    return aggregateDataByMonths(dailyData);
  };

  const fetchNutritionDailyData = async (): Promise<ChartDataPoint[]> => {
    console.log(`🍽️ Fetching nutrition data for ${trackerType} using local day bounds`);
    
    // Create chart data for last 7 days using local date bounds
    const chartData: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const localDateString = getLocalDateString(targetDate);
      const { start, end } = getLocalDayBounds(localDateString);
      const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });
      
      console.log(`📅 Fetching ${trackerType} for ${localDateString} (${start} to ${end})`);

      const { data: nutritionData, error } = await supabase
        .from('nutrition_logs')
        .select('created_at, calories, protein, carbs, fat, fiber, sodium, sugar')
        .eq('user_id', user!.id)
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      const dailyTotal = (nutritionData || []).reduce((sum, log) => {
        return sum + getValueFromLog(log, trackerType);
      }, 0);

      console.log(`📊 ${trackerType} total for ${localDateString}: ${dailyTotal}`);
      
      chartData.push({
        label: dayName,
        value: Math.round(dailyTotal),
        date: localDateString,
      });
    }

    return chartData;
  };

  const fetchToxinDailyData = async (): Promise<ChartDataPoint[]> => {
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

    console.log(`☢️ Fetching toxin data for ${toxinKey} using local day bounds`);

    // Create chart data for last 7 days using local date bounds
    const chartData: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const localDateString = getLocalDateString(targetDate);
      const { start, end } = getLocalDayBounds(localDateString);
      const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

      const { data: toxinData, error } = await supabase
        .from('toxin_detections')
        .select('created_at, serving_count')
        .eq('user_id', user!.id)
        .eq('toxin_type', toxinKey)
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      const dailyTotal = (toxinData || []).reduce((sum, detection) => {
        return sum + Number(detection.serving_count);
      }, 0);
      
      chartData.push({
        label: dayName,
        value: dailyTotal,
        date: localDateString,
      });
    }

    return chartData;
  };

  const fetchHydrationDailyData = async (): Promise<ChartDataPoint[]> => {
    console.log(`💧 Fetching hydration data using local day bounds`);
    
    // Create chart data for last 7 days using local date bounds
    const chartData: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const localDateString = getLocalDateString(targetDate);
      const { start, end } = getLocalDayBounds(localDateString);
      const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

      const { data: hydrationData, error } = await supabase
        .from('hydration_logs')
        .select('created_at, volume')
        .eq('user_id', user!.id)
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      const dailyTotal = (hydrationData || []).reduce((sum, log) => {
        return sum + log.volume;
      }, 0);
      
      chartData.push({
        label: dayName,
        value: dailyTotal,
        date: localDateString,
      });
    }

    return chartData;
  };

  const fetchSupplementDailyData = async (): Promise<ChartDataPoint[]> => {
    console.log(`💊 Fetching supplement data using local day bounds`);
    
    // Create chart data for last 7 days using local date bounds
    const chartData: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const localDateString = getLocalDateString(targetDate);
      const { start, end } = getLocalDayBounds(localDateString);
      const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

      const { data: supplementData, error } = await supabase
        .from('supplement_logs')
        .select('created_at')
        .eq('user_id', user!.id)
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      const dailyTotal = supplementData?.length || 0;
      
      chartData.push({
        label: dayName,
        value: dailyTotal,
        date: localDateString,
      });
    }

    return chartData;
  };

  const fetchStepsDailyData = async (): Promise<ChartDataPoint[]> => {
    console.log(`👟 Fetching steps data using local day bounds`);
    
    // Create chart data for last 7 days using local date bounds
    const chartData: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const localDateString = getLocalDateString(targetDate);
      const { start, end } = getLocalDayBounds(localDateString);
      const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

      const { data: exerciseData, error } = await supabase
        .from('exercise_logs')
        .select('created_at, steps')
        .eq('user_id', user!.id)
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      const dailyTotal = (exerciseData || []).reduce((sum, log) => {
        return sum + (log.steps || 0);
      }, 0);
      
      chartData.push({
        label: dayName,
        value: dailyTotal,
        date: localDateString,
      });
    }

    return chartData;
  };

  const fetchExerciseDailyData = async (): Promise<ChartDataPoint[]> => {
    console.log(`🏋️ Fetching exercise data using local day bounds`);
    
    // Create chart data for last 7 days using local date bounds
    const chartData: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const localDateString = getLocalDateString(targetDate);
      const { start, end } = getLocalDayBounds(localDateString);
      const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

      const { data: exerciseData, error } = await supabase
        .from('exercise_logs')
        .select('created_at, calories_burned')
        .eq('user_id', user!.id)
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      const dailyTotal = (exerciseData || []).reduce((sum, log) => {
        return sum + (log.calories_burned || 0);
      }, 0);
      
      chartData.push({
        label: dayName,
        value: Math.round(dailyTotal),
        date: localDateString,
      });
    }

    return chartData;
  };

  const fetchMicronutrientDailyData = async (micronutrientType: string): Promise<ChartDataPoint[]> => {
    console.log(`🧪 Fetching ${micronutrientType} data using local day bounds`);
    
    const chartData: ChartDataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const localDateString = getLocalDateString(targetDate);
      const { start, end } = getLocalDayBounds(localDateString);
      const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

      const { data: nutritionLogs, error } = await supabase
        .from('nutrition_logs')
        .select('food_name, calories, protein, carbs, fat, fiber, sugar, sodium')
        .eq('user_id', user!.id)
        .gte('created_at', start)
        .lte('created_at', end);

      if (error) throw error;

      const mappedLogs = (nutritionLogs || []).map(log => ({ ...log, name: log.food_name }));
      const micronutrients = calculateTotalMicronutrients(mappedLogs);
      const value = micronutrients[micronutrientType as keyof typeof micronutrients] || 0;
      
      chartData.push({
        label: dayName,
        value: Math.round(value * 10) / 10,
        date: localDateString,
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
        date: getLocalDateString(weekStart),
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
