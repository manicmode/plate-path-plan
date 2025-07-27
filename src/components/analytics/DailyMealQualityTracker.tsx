import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useDailyMealAverages } from '@/hooks/useDailyMealAverages';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';

const getScoreColor = (score: number) => {
  if (score >= 85) return '#10b981'; // Green for Excellent
  if (score >= 70) return '#f59e0b'; // Orange for Okay
  return '#ef4444'; // Red for Poor
};

const getScoreLabel = (score: number) => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Okay';
  return 'Poor';
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const score = payload[0].value;
    const scoreLabel = getScoreLabel(score);
    const formattedDate = format(new Date(label), 'MMM dd, yyyy');
    
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{formattedDate}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Score: <span className="font-semibold" style={{ color: getScoreColor(score) }}>
            {score} - {scoreLabel}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export const DailyMealQualityTracker = () => {
  const { data, loading, error, todaysAverage } = useDailyMealAverages();

  if (loading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg mb-0 !mb-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <TrendingUp className="h-5 w-5" />
            Meal Quality Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg mb-0 !mb-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <TrendingUp className="h-5 w-5" />
            Meal Quality Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500 text-sm">Error loading meal quality data: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg mb-0 !mb-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <TrendingUp className="h-5 w-5" />
            Meal Quality Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">No meal data available yet. Start logging meals to see your quality trend!</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for chart (reverse to show oldest to newest)
  const chartData = data.slice().reverse().map(item => ({
    ...item,
    formattedDate: format(new Date(item.date), 'MMM dd'),
    color: getScoreColor(item.average_score)
  }));

  return (
    <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg mb-0 !mb-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <TrendingUp className="h-5 w-5" />
          Meal Quality Trend
        </CardTitle>
        
        {todaysAverage && (
          <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
            <div className="text-sm text-gray-600 dark:text-gray-400">Today's Meal Score</div>
            <div className="text-2xl font-bold" style={{ color: getScoreColor(todaysAverage.average_score) }}>
              {todaysAverage.average_score} – {getScoreLabel(todaysAverage.average_score)}
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                domain={[0, 100]}
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="average_score" 
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 flex items-center justify-center gap-6 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Poor (&lt;70)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Okay (70-84)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Excellent (85+)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};