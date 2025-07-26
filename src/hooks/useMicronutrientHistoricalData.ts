import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { calculateTotalMicronutrients } from '@/utils/micronutrientCalculations';
import { getLocalDateString, getLocalDayBounds } from '@/lib/dateUtils';

interface ChartDataPoint {
  label: string;
  value: number;
  date: string;
}

const MICRONUTRIENT_CONFIGS = {
  iron: { name: 'Iron', unit: 'mg', target: 18 },
  magnesium: { name: 'Magnesium', unit: 'mg', target: 400 },
  calcium: { name: 'Calcium', unit: 'mg', target: 1000 },
  zinc: { name: 'Zinc', unit: 'mg', target: 11 },
  vitaminA: { name: 'Vitamin A', unit: 'μg', target: 900 },
  vitaminB12: { name: 'Vitamin B12', unit: 'μg', target: 2.4 },
  vitaminC: { name: 'Vitamin C', unit: 'mg', target: 90 },
  vitaminD: { name: 'Vitamin D', unit: 'μg', target: 20 },
};

export const useMicronutrientHistoricalData = (micronutrientType: string) => {
  const { user } = useAuth();
  const [dailyData, setDailyData] = useState<ChartDataPoint[]>([]);
  const [weeklyData, setWeeklyData] = useState<ChartDataPoint[]>([]);
  const [monthlyData, setMonthlyData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchMicronutrientData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch nutrition logs for the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: nutritionLogs, error: fetchError } = await supabase
          .from('nutrition_logs')
          .select('food_name, calories, protein, carbs, fat, fiber, sugar, sodium, created_at')
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        // Process daily data (last 7 days)
        const dailyChartData: ChartDataPoint[] = [];
        for (let i = 6; i >= 0; i--) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() - i);
          const localDateString = getLocalDateString(targetDate);
          const { start, end } = getLocalDayBounds(localDateString);
          const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

          // Filter logs for this day
          const dayLogs = nutritionLogs?.filter(log => {
            const logDate = new Date(log.created_at);
            return logDate >= new Date(start) && logDate <= new Date(end);
          }) || [];

          // Map to FoodItem format and calculate micronutrients
          const mappedLogs = dayLogs.map(log => ({ ...log, name: log.food_name }));
          const micronutrients = calculateTotalMicronutrients(mappedLogs);
          const value = micronutrients[micronutrientType as keyof typeof micronutrients] || 0;

          dailyChartData.push({
            label: dayName,
            value: Math.round(value * 10) / 10, // Round to 1 decimal
            date: localDateString,
          });
        }

        // Process weekly data (last 4 weeks)
        const weeklyChartData: ChartDataPoint[] = [];
        for (let i = 3; i >= 0; i--) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (i * 7) - 6);
          const weekEnd = new Date();
          weekEnd.setDate(weekEnd.getDate() - (i * 7));

          const weekLogs = nutritionLogs?.filter(log => {
            const logDate = new Date(log.created_at);
            return logDate >= weekStart && logDate <= weekEnd;
          }) || [];

          const mappedWeekLogs = weekLogs.map(log => ({ ...log, name: log.food_name }));
          const micronutrients = calculateTotalMicronutrients(mappedWeekLogs);
          const totalValue = micronutrients[micronutrientType as keyof typeof micronutrients] || 0;
          const avgValue = totalValue / 7; // Average per day

          weeklyChartData.push({
            label: i === 0 ? 'This Week' : `Week ${4 - i}`,
            value: Math.round(avgValue * 10) / 10,
            date: weekStart.toISOString().split('T')[0],
          });
        }

        // Process monthly data (last 3 months)
        const monthlyChartData: ChartDataPoint[] = [];
        for (let i = 2; i >= 0; i--) {
          const monthStart = new Date();
          monthStart.setMonth(monthStart.getMonth() - i, 1);
          const monthEnd = new Date();
          monthEnd.setMonth(monthEnd.getMonth() - i + 1, 0);

          const monthLogs = nutritionLogs?.filter(log => {
            const logDate = new Date(log.created_at);
            return logDate >= monthStart && logDate <= monthEnd;
          }) || [];

          const mappedMonthLogs = monthLogs.map(log => ({ ...log, name: log.food_name }));
          const micronutrients = calculateTotalMicronutrients(mappedMonthLogs);
          const totalValue = micronutrients[micronutrientType as keyof typeof micronutrients] || 0;
          const daysInMonth = new Date(monthEnd.getFullYear(), monthEnd.getMonth() + 1, 0).getDate();
          const avgValue = totalValue / daysInMonth;

          monthlyChartData.push({
            label: monthStart.toLocaleDateString('en-US', { month: 'short' }),
            value: Math.round(avgValue * 10) / 10,
            date: monthStart.toISOString().split('T')[0],
          });
        }

        setDailyData(dailyChartData);
        setWeeklyData(weeklyChartData);
        setMonthlyData(monthlyChartData);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch micronutrient data');
        console.error('Error fetching micronutrient data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMicronutrientData();
  }, [user?.id, micronutrientType]);

  return {
    dailyData,
    weeklyData,
    monthlyData,
    isLoading,
    error,
    config: MICRONUTRIENT_CONFIGS[micronutrientType as keyof typeof MICRONUTRIENT_CONFIGS]
  };
};