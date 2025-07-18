import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DailyMealAverage {
  date: string;
  average_score: number;
}

interface DailyMealAveragesResponse {
  success: boolean;
  data: DailyMealAverage[];
  total_days: number;
}

export const useDailyMealAverages = () => {
  const [data, setData] = useState<DailyMealAverage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDailyAverages = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: result, error: fetchError } = await supabase.functions.invoke(
          'calculate-daily-meal-averages',
          {
            method: 'GET',
          }
        );

        if (fetchError) {
          throw fetchError;
        }

        const response = result as DailyMealAveragesResponse;
        
        if (response.success) {
          setData(response.data);
        } else {
          throw new Error('Failed to fetch daily meal averages');
        }
      } catch (err) {
        console.error('Error fetching daily meal averages:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDailyAverages();
  }, []);

  const todaysAverage = data.find(item => {
    const today = new Date().toISOString().split('T')[0];
    return item.date === today;
  });

  return {
    data,
    loading,
    error,
    todaysAverage
  };
};