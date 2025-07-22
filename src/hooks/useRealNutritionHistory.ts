
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { getLocalDateString, getLocalDayBounds } from '@/lib/dateUtils';

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

        console.log('📊 Fetching nutrition history with local time support...');

        // Process daily data (last 7 days) using local date bounds
        const processedDailyData: NutritionDayData[] = [];
        for (let i = 6; i >= 0; i--) {
          const targetDate = new Date();
          targetDate.setDate(targetDate.getDate() - i);
          const localDateString = getLocalDateString(targetDate);
          const { start, end } = getLocalDayBounds(localDateString);
          
          console.log(`📅 Fetching data for local date: ${localDateString} (${start} to ${end})`);

          const { data: dayLogs, error: dayError } = await supabase
            .from('nutrition_logs')
            .select('created_at, calories, protein, carbs, fat')
            .eq('user_id', user.id)
            .gte('created_at', start)
            .lte('created_at', end)
            .order('created_at', { ascending: true });

          if (dayError) throw dayError;
          
          const totals = (dayLogs || []).reduce(
            (acc, log) => ({
              calories: acc.calories + (log.calories || 0),
              protein: acc.protein + (log.protein || 0),
              carbs: acc.carbs + (log.carbs || 0),
              fat: acc.fat + (log.fat || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          );

          console.log(`📊 Day ${localDateString}: ${totals.calories} calories, ${dayLogs?.length || 0} logs`);

          processedDailyData.push({
            date: localDateString,
            ...totals
          });
        }

        // Process weekly data (last 4 weeks) using local date bounds
        const processedWeeklyData: NutritionDayData[] = [];
        for (let week = 3; week >= 0; week--) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (week * 7 + 6));
          const weekEnd = new Date();
          weekEnd.setDate(weekEnd.getDate() - (week * 7));
          
          const weekStartString = getLocalDateString(weekStart);
          const weekEndString = getLocalDateString(weekEnd);
          
          // Get bounds for the entire week
          const { start } = getLocalDayBounds(weekStartString);
          const { end } = getLocalDayBounds(weekEndString);
          
          console.log(`📊 Fetching week data from ${weekStartString} to ${weekEndString}`);

          const { data: weekLogs, error: weekError } = await supabase
            .from('nutrition_logs')
            .select('created_at, calories, protein, carbs, fat')
            .eq('user_id', user.id)
            .gte('created_at', start)
            .lte('created_at', end);

          if (weekError) throw weekError;
          
          const weekTotals = (weekLogs || []).reduce(
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
            date: weekStartString,
            calories: Math.round(weekTotals.calories / daysInWeek),
            protein: Math.round(weekTotals.protein / daysInWeek),
            carbs: Math.round(weekTotals.carbs / daysInWeek),
            fat: Math.round(weekTotals.fat / daysInWeek),
          });
        }

        // Process monthly data (last 3 months) using local date bounds
        const processedMonthlyData: NutritionDayData[] = [];
        for (let month = 2; month >= 0; month--) {
          const monthDate = subMonths(new Date(), month);
          const monthStart = startOfMonth(monthDate);
          const monthEnd = endOfMonth(monthDate);
          
          const monthStartString = getLocalDateString(monthStart);
          const monthEndString = getLocalDateString(monthEnd);
          
          // Get bounds for the entire month
          const { start } = getLocalDayBounds(monthStartString);
          const { end } = getLocalDayBounds(monthEndString);
          
          console.log(`📊 Fetching month data from ${monthStartString} to ${monthEndString}`);

          const { data: monthLogs, error: monthError } = await supabase
            .from('nutrition_logs')
            .select('created_at, calories, protein, carbs, fat')
            .eq('user_id', user.id)
            .gte('created_at', start)
            .lte('created_at', end);

          if (monthError) throw monthError;

          const monthTotals = (monthLogs || []).reduce(
            (acc, log) => ({
              calories: acc.calories + (log.calories || 0),
              protein: acc.protein + (log.protein || 0),
              carbs: acc.carbs + (log.carbs || 0),
              fat: acc.fat + (log.fat || 0),
            }),
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
          );

          // Average per day for the month
          const daysInMonth = monthEnd.getDate();
          processedMonthlyData.push({
            date: monthStartString,
            calories: Math.round(monthTotals.calories / daysInMonth),
            protein: Math.round(monthTotals.protein / daysInMonth),
            carbs: Math.round(monthTotals.carbs / daysInMonth),
            fat: Math.round(monthTotals.fat / daysInMonth),
          });
        }

        setDailyData(processedDailyData);
        setWeeklyData(processedWeeklyData);
        setMonthlyData(processedMonthlyData);
        
        console.log('✅ Nutrition history loaded with local time support');
      } catch (err) {
        console.error('❌ Error fetching nutrition history:', err);
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
