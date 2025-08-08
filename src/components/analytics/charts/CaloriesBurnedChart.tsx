import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';

export const CaloriesBurnedChart = () => {
  const { weeklyChartData, summary, isLoading, error } = useRealExerciseData('7d');

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔥 Calories Burned from Exercise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center">
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
            🔥 Calories Burned from Exercise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
            <div className="text-4xl mb-2">💪</div>
            <p>No exercise calories logged yet</p>
            <p className="text-sm">Start working out to track calories burned!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-700 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-orange-900 dark:text-orange-100 flex items-center gap-2">
              🔥 Calories Burned from Exercise
            </CardTitle>
            <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">Weekly calorie burn from workouts</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">{summary.totalCalories}</div>
            <div className="text-sm text-orange-500 dark:text-orange-400">kcal this week</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={weeklyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#fed7aa" />
            <XAxis 
              dataKey="day" 
              stroke="#ea580c"
              fontSize={12}
              fontWeight={500}
            />
            <YAxis 
              stroke="#ea580c"
              fontSize={12}
              fontWeight={500}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '2px solid #f97316',
                borderRadius: '12px',
                boxShadow: '0 8px 25px rgba(249, 115, 22, 0.2)',
                fontSize: '14px',
                fontWeight: '500'
              }}
              formatter={(value: number) => [`${value} kcal`, 'Calories']}
            />
            <Area 
              type="monotone" 
              dataKey="calories" 
              stroke="url(#orangeGradient)"
              fill="url(#orangeAreaGradient)"
              strokeWidth={3}
            />
            <defs>
              <linearGradient id="orangeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
              <linearGradient id="orangeAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#dc2626" stopOpacity={0.1} />
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};