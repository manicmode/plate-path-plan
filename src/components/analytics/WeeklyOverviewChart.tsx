
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNutrition } from '@/contexts/NutritionContext';
import { useAuth } from '@/contexts/AuthContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';

type MetricType = 'calories' | 'protein' | 'carbs' | 'fat' | 'hydration' | 'steps' | 'exercise';

export const WeeklyOverviewChart = () => {
  const { weeklyData } = useNutrition();
  const { user } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('calories');

  const metricOptions = [
    { value: 'calories', label: 'Calories', color: '#3B82F6', target: user?.targetCalories || 2000 },
    { value: 'protein', label: 'Protein (g)', color: '#10B981', target: user?.targetProtein || 120 },
    { value: 'carbs', label: 'Carbs (g)', color: '#F59E0B', target: user?.targetCarbs || 250 },
    { value: 'fat', label: 'Fat (g)', color: '#8B5CF6', target: user?.targetFat || 65 },
    { value: 'hydration', label: 'Hydration (ml)', color: '#06B6D4', target: user?.targetHydration || 2000 },
    { value: 'steps', label: 'Steps', color: '#22C55E', target: 10000 },
    { value: 'exercise', label: 'Exercise (min)', color: '#F97316', target: 30 },
  ];

  const currentMetric = metricOptions.find(m => m.value === selectedMetric);

  const chartData = weeklyData.slice(-7).map((day, index) => {
    const getValue = () => {
      switch (selectedMetric) {
        case 'calories': return day.totalCalories;
        case 'protein': return day.totalProtein;
        case 'carbs': return day.totalCarbs;
        case 'fat': return day.totalFat;
        case 'hydration': return day.totalHydration;
        case 'steps': return 8500 + Math.random() * 2000; // Mock data
        case 'exercise': return 20 + Math.random() * 40; // Mock data
        default: return 0;
      }
    };

    return {
      day: `Day ${index + 1}`,
      value: getValue(),
      target: currentMetric?.target || 0
    };
  });

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

  return (
    <Card className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-lg">
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
        </div>
      </CardContent>
    </Card>
  );
};
