import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

interface SupplementLog {
  name: string;
  dosage: number;
  unit: string;
  created_at: string;
}

interface UseRealSupplementDataReturn {
  todayCount: number;
  todaySupplements: Array<{ name: string; dosage: number; unit: string }>;
  weeklyData: Array<{ date: string; count: number }>;
  monthlyData: Array<{ date: string; count: number }>;
  isLoading: boolean;
  error: string | null;
}

export const useRealSupplementData = (): UseRealSupplementDataReturn => {
  const { user } = useAuth();
  const [todayCount, setTodayCount] = useState(0);
  const [todaySupplements, setTodaySupplements] = useState<Array<{ name: string; dosage: number; unit: string }>>([]);
  const [weeklyData, setWeeklyData] = useState<Array<{ date: string; count: number }>>([]);
  const [monthlyData, setMonthlyData] = useState<Array<{ date: string; count: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchSupplementData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        // Get last 30 days of data
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        // Fetch all supplement logs for the last 30 days
        const { data: supplementLogs, error: fetchError } = await supabase
          .from('supplement_logs')
          .select('name, dosage, unit, created_at')
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgoStr)
          .order('created_at', { ascending: false });

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        const logs = supplementLogs || [];

        // Process today's supplements
        const todayLogs = logs.filter(log => 
          new Date(log.created_at).toDateString() === today.toDateString()
        );
        
        setTodayCount(todayLogs.length);
        setTodaySupplements(todayLogs.map(log => ({
          name: log.name,
          dosage: log.dosage,
          unit: log.unit
        })));

        // Process weekly data (last 7 days)
        const weeklySupplementData: Array<{ date: string; count: number }> = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayLogs = logs.filter(log => 
            new Date(log.created_at).toDateString() === date.toDateString()
          );
          
          const dayName = i === 0 ? 'Today' : 
                         i === 1 ? 'Yesterday' :
                         date.toLocaleDateString('en-US', { weekday: 'short' });
          
          weeklySupplementData.push({
            date: dayName,
            count: dayLogs.length
          });
        }
        setWeeklyData(weeklySupplementData);

        // Process monthly data (last 4 weeks)
        const monthlySupplementData: Array<{ date: string; count: number }> = [];
        for (let i = 3; i >= 0; i--) {
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - (i * 7) - 6);
          const weekEnd = new Date();
          weekEnd.setDate(weekEnd.getDate() - (i * 7));
          
          const weekLogs = logs.filter(log => {
            const logDate = new Date(log.created_at);
            return logDate >= weekStart && logDate <= weekEnd;
          });
          
          const avgCount = weekLogs.length / 7; // Average per day for the week
          
          monthlySupplementData.push({
            date: i === 0 ? 'This Week' : `Week ${4 - i}`,
            count: Math.round(avgCount * 10) / 10 // Round to 1 decimal place
          });
        }
        setMonthlyData(monthlySupplementData);

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch supplement data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSupplementData();
  }, [user?.id]);

  return {
    todayCount,
    todaySupplements,
    weeklyData,
    monthlyData,
    isLoading,
    error
  };
};