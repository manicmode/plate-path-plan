import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useDailyMealAverages } from '@/hooks/useDailyMealAverages';
import { Skeleton } from '@/components/ui/skeleton';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Quality Score: {payload[0].value}/10
        </p>
      </div>
    );
  }
  return null;
};

export const MealQualityTrendChart = () => {
  const { data, loading, error } = useDailyMealAverages();

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Meal Quality Trend
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
      { date: '12/01', score: 7.2 },
      { date: '12/02', score: 6.8 },
      { date: '12/03', score: 8.1 },
      { date: '12/04', score: 7.5 },
      { date: '12/05', score: 8.3 },
      { date: '12/06', score: 7.9 },
      { date: '12/07', score: 8.0 },
    ];

    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Meal Quality Trend
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Track your daily meal quality scores over time
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockData}>
                <XAxis 
                  dataKey="date" 
                  className="text-gray-600 dark:text-gray-300"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  domain={[0, 10]}
                  className="text-gray-600 dark:text-gray-300"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: '#3B82F6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, stroke: '#3B82F6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Sample data - Start logging meals to see your real trend
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare real data
  const chartData = data
    .slice(-14) // Last 14 days
    .map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
      score: Number(item.average_score.toFixed(1))
    }));

  const averageScore = chartData.length > 0 
    ? (chartData.reduce((sum, item) => sum + item.score, 0) / chartData.length).toFixed(1)
    : '0';

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-500" />
          Meal Quality Trend
        </CardTitle>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Track your daily meal quality scores over time • Avg: {averageScore}/10
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis 
                dataKey="date" 
                className="text-gray-600 dark:text-gray-300"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, 10]}
                className="text-gray-600 dark:text-gray-300"
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', r: 5, strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7, stroke: '#3B82F6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};