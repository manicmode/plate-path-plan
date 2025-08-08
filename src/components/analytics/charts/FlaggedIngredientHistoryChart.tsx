import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Skeleton } from '@/components/ui/skeleton';

interface WeeklyFlaggedData {
  week: string;
  flagged_count: number;
  total_meals: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-sm text-red-600 dark:text-red-400">
          Flagged Foods: {data.flagged_count}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total Meals: {data.total_meals}
        </p>
      </div>
    );
  }
  return null;
};

export const FlaggedIngredientHistoryChart = () => {
  const { user } = useAuth();
  const [data, setData] = useState<WeeklyFlaggedData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlaggedHistory = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        // Get the last 8 weeks of data
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 56); // 8 weeks ago

        const { data: nutritionLogs, error: logsError } = await supabase
          .from('nutrition_logs')
          .select('created_at, quality_score, ingredient_analysis')
          .eq('user_id', user.id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: true });

        if (logsError) {
          throw logsError;
        }

        // Group data by week
        const weeklyData: Record<string, { flagged: number; total: number }> = {};
        
        nutritionLogs?.forEach(log => {
          const logDate = new Date(log.created_at);
          const weekStart = new Date(logDate);
          weekStart.setDate(logDate.getDate() - logDate.getDay()); // Start of week (Sunday)
          const weekKey = weekStart.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });

          if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { flagged: 0, total: 0 };
          }

          weeklyData[weekKey].total++;
          
          // Check if meal has flagged ingredients or low quality score
          const hasProblematicIngredients = log.ingredient_analysis && 
            typeof log.ingredient_analysis === 'object' &&
            Object.values(log.ingredient_analysis).some((analysis: any) => 
              analysis?.flagged === true || analysis?.concerns?.length > 0
            );
          const isLowQuality = log.quality_score && log.quality_score < 50;
          
          if (hasProblematicIngredients || isLowQuality) {
            weeklyData[weekKey].flagged++;
          }
        });

        // Convert to array format
        const chartData = Object.entries(weeklyData)
          .map(([week, counts]) => ({
            week,
            flagged_count: counts.flagged,
            total_meals: counts.total
          }))
          .slice(-6); // Last 6 weeks

        setData(chartData);
      } catch (err) {
        console.error('Error fetching flagged ingredient history:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchFlaggedHistory();
  }, [user]);

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Flagged Ingredient History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data || data.length === 0) {
    // Mock data for demonstration
    const mockData = [
      { week: '11/10', flagged_count: 2, total_meals: 15 },
      { week: '11/17', flagged_count: 1, total_meals: 18 },
      { week: '11/24', flagged_count: 3, total_meals: 12 },
      { week: '12/01', flagged_count: 1, total_meals: 20 },
      { week: '12/08', flagged_count: 0, total_meals: 16 },
      { week: '12/15', flagged_count: 2, total_meals: 14 },
    ];

    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Flagged Ingredient History
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Weekly count of foods with flagged ingredients or low quality scores
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockData}>
                <XAxis 
                  dataKey="week" 
                  className="text-gray-600 dark:text-gray-300"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-gray-600 dark:text-gray-300"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="flagged_count"
                  fill="#EF4444"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sample data - Start logging meals to see your real flagged ingredient history
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalFlagged = data.reduce((sum, week) => sum + week.flagged_count, 0);
  const totalMeals = data.reduce((sum, week) => sum + week.total_meals, 0);
  const flaggedPercentage = totalMeals > 0 ? ((totalFlagged / totalMeals) * 100).toFixed(1) : '0';

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Flagged Ingredient History
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Weekly flagged foods • {flaggedPercentage}% of meals flagged (last 6 weeks)
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis 
                dataKey="week" 
                className="text-gray-600 dark:text-gray-300"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-gray-600 dark:text-gray-300"
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="flagged_count"
                fill="#EF4444"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};