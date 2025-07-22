
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface NutritionDayData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface NutritionHistoryResult {
  dailyData: NutritionDayData[];
  weeklyData: NutritionDayData[];
  monthlyData: NutritionDayData[];
  isLoading: boolean;
  error: string | null;
}

export const useRealNutritionHistory = (): NutritionHistoryResult => {
  const { user } = useAuth();
  const [dailyData, setDailyData] = useState<NutritionDayData[]>([]);
  const [weeklyData, setWeeklyData] = useState<NutritionDayData[]>([]);
  const [monthlyData, setMonthlyData] = useState<NutritionDayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchNutritionHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get last 7 days of data
        const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');
        const today = format(new Date(), 'yyyy-MM-dd');

        const { data: weeklyLogs, error: weeklyError } = await supabase
          .from('nutrition_logs')
          .select('created_at, calories, protein, carbs, fat')
          .eq('user_id', user.id)
          .gte('created_at', sevenDaysAgo)
          .lte('created_at', today + 'T23:59:59.999Z')
          .order('created_at', { ascending: true });

        if (weeklyError) throw weeklyError;

        // Get last 4 weeks of data (28 days)
        const fourWeeksAgo = format(subDays(new Date(), 27), 'yyyy-MM-dd');

        const { data: monthlyLogs, error: monthlyError } = await supabase
          .from('nutrition_logs')
          .select('created_at, calories, protein, carbs, fat')
          .eq('user_id', user.id)
          .gte('created_at', fourWeeksAgo)
          .lte('created_at', today + 'T23:59:59.999Z')
          .order('created_at', { ascending: true });

        if (monthlyError) throw monthlyError;

        // Process daily data (last 7 days)
        const processedDailyData: NutritionDayData[] = [];
        for (let i = 6; i >= 0; i--) {
          const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
          const dayLogs = weeklyLogs?.filter(log => 
            format(new Date(log.created_at), 'yyyy-MM-dd') === date
          ) || [];
          
          const totals = dayLogs.reduce(
            (acc, log) => ({
              calories: acc.calories + (log.calories || 0),
              protein: acc.protein + (log.protein || 0),
              carbs: acc.carbs + (log.carbs || 0),
              fat: acc.fat + (log.fat || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          );

          processedDailyData.push({
            date,
            ...totals
          });
        }

        // Process weekly data (last 4 weeks)
        const processedWeeklyData: NutritionDayData[] = [];
        for (let week = 3; week >= 0; week--) {
          const weekStart = subDays(new Date(), week * 7 + 6);
          const weekEnd = subDays(new Date(), week * 7);
          const weekStartStr = format(weekStart, 'yyyy-MM-dd');
          const weekEndStr = format(weekEnd, 'yyyy-MM-dd');
          
          const weekLogs = monthlyLogs?.filter(log => {
            const logDate = format(new Date(log.created_at), 'yyyy-MM-dd');
            return logDate >= weekStartStr && logDate <= weekEndStr;
          }) || [];
          
          const weekTotals = weekLogs.reduce(
            (acc, log) => ({
              calories: acc.calories + (log.calories || 0),
              protein: acc.protein + (log.protein || 0),
              carbs: acc.carbs + (log.carbs || 0),
              fat: acc.fat + (log.fat || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          );

          // Average per day for the week
          const daysInWeek = 7;
          processedWeeklyData.push({
            date: weekStartStr,
            calories: Math.round(weekTotals.calories / daysInWeek),
            protein: Math.round(weekTotals.protein / daysInWeek),
            carbs: Math.round(weekTotals.carbs / daysInWeek),
            fat: Math.round(weekTotals.fat / daysInWeek),
          });
        }

        // Process monthly data (last 3 months)
        const processedMonthlyData: NutritionDayData[] = [];
        for (let month = 2; month >= 0; month--) {
          const monthDate = subMonths(new Date(), month);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          const { data: monthLogs, error: monthError } = await supabase
            .from('nutrition_logs')
            .select('created_at, calories, protein, carbs, fat')
            .eq('user_id', user.id)
            .gte('created_at', format(monthStart, 'yyyy-MM-dd'))
            .lte('created_at', format(monthEnd, 'yyyy-MM-dd') + 'T23:59:59.999Z');

          if (monthError) throw monthError;

          const monthTotals = monthLogs?.reduce(
            (acc, log) => ({
              calories: acc.calories + (log.calories || 0),
              protein: acc.protein + (log.protein || 0),
              carbs: acc.carbs + (log.carbs || 0),
              fat: acc.fat + (log.fat || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          ) || { calories: 0, protein: 0, carbs: 0, fat: 0 };

          // Average per day for the month
          const daysInMonth = monthEnd.getDate();
          processedMonthlyData.push({
            date: format(monthStart, 'yyyy-MM-dd'),
            calories: Math.round(monthTotals.calories / daysInMonth),
            protein: Math.round(monthTotals.protein / daysInMonth),
            carbs: Math.round(monthTotals.carbs / daysInMonth),
            fat: Math.round(monthTotals.fat / daysInMonth),
          });
        }

        setDailyData(processedDailyData);
        setWeeklyData(processedWeeklyData);
        setMonthlyData(processedMonthlyData);
      } catch (err) {
        console.error('Error fetching nutrition history:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch nutrition history');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNutritionHistory();
  }, [user?.id]);

  return {
    dailyData,
    weeklyData,
    monthlyData,
    isLoading,
    error
  };
};
