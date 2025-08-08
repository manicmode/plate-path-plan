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
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🔥 Calories Burned from Exercise
        </CardTitle>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{summary.totalCalories}</div>
          <div className="text-sm text-muted-foreground">kcal this week</div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={weeklyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="day" 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis 
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
              formatter={(value: number) => [`${value} kcal`, 'Calories']}
            />
            <Area 
              type="monotone" 
              dataKey="calories" 
              stroke="hsl(var(--destructive))"
              fill="hsl(var(--destructive) / 0.2)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};