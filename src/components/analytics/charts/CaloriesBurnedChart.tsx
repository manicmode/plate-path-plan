import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';

export const CaloriesBurnedChart = () => {
  const { weeklyChartData, summary, isLoading, error } = useRealExerciseData('7d');

  if (isLoading) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            🔥 Calories Burned from Exercise
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center text-muted-foreground">
            Loading calorie data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !weeklyChartData || weeklyChartData.length === 0) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            🔥 Calories Burned from Exercise
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center text-muted-foreground">
            <div className="text-4xl mb-2">🔥</div>
            <p>No exercise calories logged yet</p>
            <p className="text-sm">Start working out to track calories burned!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalCalories = summary?.totalCalories || 0;

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          🔥 Calories Burned from Exercise
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Weekly total</p>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{totalCalories}</div>
            <div className="text-xs text-muted-foreground">kcal this week</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={weeklyChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="day" 
              className="text-xs text-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              className="text-xs text-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              formatter={(value: any) => [`${value} kcal`, 'Calories']}
              labelFormatter={(label) => `${label}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="calories" 
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};