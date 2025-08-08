
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNutrition } from '@/contexts/NutritionContext';
import { useAuth } from '@/contexts/auth';
import { useRealNutritionHistory } from '@/hooks/useRealNutritionHistory';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

type MetricType = 'calories' | 'protein' | 'carbs' | 'fat' | 'hydration' | 'steps' | 'exercise';

export const WeeklyOverviewChart = () => {
  const { weeklyData } = useNutrition();
  const { user } = useAuth();
  const { dailyData, isLoading } = useRealNutritionHistory();
  const { weeklyChartData: exerciseWeeklyData, isLoading: exerciseLoading } = useRealExerciseData('7d');
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('calories');

  // Convert targetHydration (glasses) to ml for hydration metric
  const hydrationTargetMl = (user?.targetHydration || 8) * 250;

  const metricOptions = [
    { value: 'calories', label: 'Calories', color: '#3B82F6', target: user?.targetCalories || 2000 },
    { value: 'protein', label: 'Protein (g)', color: '#10B981', target: user?.targetProtein || 120 },
    { value: 'carbs', label: 'Carbs (g)', color: '#F59E0B', target: user?.targetCarbs || 250 },
    { value: 'fat', label: 'Fat (g)', color: '#8B5CF6', target: user?.targetFat || 65 },
    { value: 'hydration', label: 'Hydration (ml)', color: '#06B6D4', target: hydrationTargetMl },
    { value: 'steps', label: 'Steps', color: '#22C55E', target: 10000 },
    { value: 'exercise', label: 'Exercise (min)', color: '#F97316', target: 30 },
  ];

  const currentMetric = metricOptions.find(m => m.value === selectedMetric);

  const chartData = React.useMemo(() => {
    if (isLoading || exerciseLoading) return [];

    if (dailyData.length > 0 && ['calories', 'protein', 'carbs', 'fat'].includes(selectedMetric)) {
      // Use real nutrition data for nutrition metrics
      return dailyData.map((day, index) => {
        const getValue = () => {
          switch (selectedMetric) {
            case 'calories': return day.calories;
            case 'protein': return day.protein;
            case 'carbs': return day.carbs;
            case 'fat': return day.fat;
            default: return 0;
          }
        };

        return {
          day: `Day ${index + 1}`,
          value: getValue(),
          target: currentMetric?.target || 0
        };
      });
    } else if (exerciseWeeklyData.length > 0 && ['steps', 'exercise'].includes(selectedMetric)) {
      // Use real exercise data for exercise metrics
      return exerciseWeeklyData.map((day) => {
        const getValue = () => {
          switch (selectedMetric) {
            case 'steps': return day.steps;
            case 'exercise': return day.duration;
            default: return 0;
          }
        };

        return {
          day: (day as any).label ?? (day as any).day,
          value: getValue(),
          target: currentMetric?.target || 0
        };
      });
    } else if (weeklyData.length > 0) {
      // Use existing data for hydration or as fallback
      return weeklyData.slice(-7).map((day, index) => {
        const getValue = () => {
          switch (selectedMetric) {
            case 'calories': return day.totalCalories;
            case 'protein': return day.totalProtein;
            case 'carbs': return day.totalCarbs;
            case 'fat': return day.totalFat;
            case 'hydration': return day.totalHydration;
            default: return 0;
          }
        };

        return {
          day: `Day ${index + 1}`,
          value: getValue(),
          target: currentMetric?.target || 0
        };
      });
    } else {
      // Return empty array instead of mock data
      return [];
    }
  }, [dailyData, exerciseWeeklyData, weeklyData, selectedMetric, currentMetric?.target, isLoading, exerciseLoading]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600">
          <p className="text-gray-900 dark:text-white font-medium">{label}</p>
          <p className="text-sm" style={{ color: currentMetric?.color }}>
            {currentMetric?.label}: {Math.round(payload[0].value)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Target: {currentMetric?.target}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading || exerciseLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-lg mb-0 !mb-0">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Weekly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-gray-600 dark:text-gray-400">Loading nutrition data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-lg mb-0 !mb-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-gray-900 dark:text-white">Weekly Overview</CardTitle>
          <Select value={selectedMetric} onValueChange={(value) => setSelectedMetric(value as MetricType)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent>
              {metricOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id={`gradient-${selectedMetric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={currentMetric?.color} stopOpacity={0.4}/>
                    <stop offset="95%" stopColor={currentMetric?.color} stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.2)" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fill: 'currentColor', fontSize: 12 }} 
                  className="text-gray-600 dark:text-gray-300"
                />
                <YAxis 
                  tick={{ fill: 'currentColor', fontSize: 12 }} 
                  className="text-gray-600 dark:text-gray-300"
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine 
                  y={currentMetric?.target} 
                  stroke={currentMetric?.color} 
                  strokeDasharray="5 5" 
                  strokeOpacity={0.6}
                  label={{ value: "Goal", position: "insideTopRight", fill: currentMetric?.color }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={currentMetric?.color} 
                  fillOpacity={1} 
                  fill={`url(#gradient-${selectedMetric})`}
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <p>No data available</p>
                <p className="text-sm">Start logging meals to see your progress</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
