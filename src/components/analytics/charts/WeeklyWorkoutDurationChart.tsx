import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';

export const WeeklyWorkoutDurationChart = () => {
  const { weeklyChartData, isLoading, error } = useRealExerciseData('7d');

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Weekly Workout Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weeklyChartData || weeklyChartData.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Weekly Workout Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <div className="text-4xl mb-2">🏃‍♂️</div>
            <p>No workouts logged yet</p>
            <p className="text-sm">Start exercising to see your daily progress!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-700 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
              📊 Weekly Workout Duration
            </CardTitle>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">Minutes exercised each day</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={weeklyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#bfdbfe" />
            <XAxis 
              dataKey="day" 
              stroke="#1e40af"
              fontSize={12}
              fontWeight={500}
            />
            <YAxis 
              stroke="#1e40af"
              fontSize={12}
              fontWeight={500}
              label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                boxShadow: '0 8px 25px rgba(59, 130, 246, 0.2)',
                fontSize: '14px',
                fontWeight: '500'
              }}
              formatter={(value: number) => [`${value} min`, 'Duration']}
            />
            <Bar 
              dataKey="duration" 
              fill="url(#blueGradient)"
              radius={[6, 6, 0, 0]}
            />
            <defs>
              <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};