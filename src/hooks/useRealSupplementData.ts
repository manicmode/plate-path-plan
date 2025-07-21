
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export const useRealSupplementData = (days: number = 7) => {
  const [data, setData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayTotal, setTodayTotal] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const fetchSupplementData = async () => {
      setLoading(true);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);

      const { data: supplementLogs, error } = await supabase
        .from('supplement_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching supplement data:', error);
        setLoading(false);
        return;
      }

      // Group by day and count supplements
      const dailyTotals: { [date: string]: number } = {};
      const today = new Date().toISOString().split('T')[0];
      let todaySum = 0;

      supplementLogs?.forEach(log => {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        
        if (!dailyTotals[date]) {
          dailyTotals[date] = 0;
        }

        dailyTotals[date] += 1;

        if (date === today) {
          todaySum += 1;
        }
      });

      // Convert to array format for charts
      const chartData: number[] = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const dateString = date.toISOString().split('T')[0];
        
        chartData.push(dailyTotals[dateString] || 0);
      }

      setData(chartData);
      setTodayTotal(todaySum);
      setLoading(false);
    };

    fetchSupplementData();
  }, [user?.id, days]);

  return { data, todayTotal, loading };
};
