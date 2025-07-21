
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface MoodData {
  mood: number;
  energy: number;
  wellness: number;
}

export const useRealMoodData = (days: number = 7) => {
  const [data, setData] = useState<MoodData[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState<MoodData | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const fetchMoodData = async () => {
      setLoading(true);
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (days - 1));
      startDate.setHours(0, 0, 0, 0);

      const { data: moodLogs, error } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching mood data:', error);
        setLoading(false);
        return;
      }

      // Group by day and get latest mood entry for each day
      const dailyMoods: { [date: string]: MoodData } = {};
      const today = new Date().toISOString().split('T')[0];
      let todayMood: MoodData | null = null;

      moodLogs?.forEach(log => {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        
        dailyMoods[date] = {
          mood: log.mood || 0,
          energy: log.energy || 0,
          wellness: log.wellness || 0
        };

        if (date === today) {
          todayMood = {
            mood: log.mood || 0,
            energy: log.energy || 0,
            wellness: log.wellness || 0
          };
        }
      });

      // Convert to array format for charts
      const chartData: MoodData[] = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (days - 1 - i));
        const dateString = date.toISOString().split('T')[0];
        
        chartData.push(dailyMoods[dateString] || {
          mood: 0,
          energy: 0,
          wellness: 0
        });
      }

      setData(chartData);
      setTodayData(todayMood);
      setLoading(false);
    };

    fetchMoodData();
  }, [user?.id, days]);

  return { data, todayData, loading };
};
