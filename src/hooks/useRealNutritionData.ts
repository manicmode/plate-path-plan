
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export const useRealNutritionData = (days: number = 7) => {
  const [data, setData] = useState<NutritionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayTotal, setTodayTotal] = useState<NutritionData>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0
  });
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const fetchNutritionData = async () => {
      setLoading(true);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);

      const { data: nutritionLogs, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching nutrition data:', error);
        setLoading(false);
        return;
      }

      // Group by day and calculate totals
      const dailyTotals: { [date: string]: NutritionData } = {};
      const today = new Date().toISOString().split('T')[0];
      let todaySum: NutritionData = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0
      };

      nutritionLogs?.forEach(log => {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        
        if (!dailyTotals[date]) {
          dailyTotals[date] = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0
          };
        }

        dailyTotals[date].calories += log.calories || 0;
        dailyTotals[date].protein += log.protein || 0;
        dailyTotals[date].carbs += log.carbs || 0;
        dailyTotals[date].fat += log.fat || 0;
        dailyTotals[date].fiber += log.fiber || 0;
        dailyTotals[date].sugar += log.sugar || 0;
        dailyTotals[date].sodium += log.sodium || 0;

        if (date === today) {
          todaySum.calories += log.calories || 0;
          todaySum.protein += log.protein || 0;
          todaySum.carbs += log.carbs || 0;
          todaySum.fat += log.fat || 0;
          todaySum.fiber += log.fiber || 0;
          todaySum.sugar += log.sugar || 0;
          todaySum.sodium += log.sodium || 0;
        }
      });

      // Convert to array format for charts
      const chartData: NutritionData[] = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const dateString = date.toISOString().split('T')[0];
        
        chartData.push(dailyTotals[dateString] || {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sugar: 0,
          sodium: 0
        });
      }

      setData(chartData);
      setTodayTotal(todaySum);
      setLoading(false);
    };

    fetchNutritionData();
  }, [user?.id, days]);

  return { data, todayTotal, loading };
};
