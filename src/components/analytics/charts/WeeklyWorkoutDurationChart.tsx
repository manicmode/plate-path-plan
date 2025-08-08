import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';

export const WeeklyWorkoutDurationChart = () => {
  const { weeklyChartData, isLoading, error } = useRealExerciseData('7d');

  if (isLoading) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            📊 Weekly Workout Duration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            Loading workout data...
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
            📊 Weekly Workout Duration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <div className="text-4xl mb-2">🏃‍♂️</div>
            <p>No workouts logged yet</p>
            <p className="text-sm">Start exercising to see your progress!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTooltip = (value: any, name: string) => {
    if (name === 'duration') {
      return [`${value} min`, 'Duration'];
    }
    return [value, name];
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          📊 Weekly Workout Duration
        </CardTitle>
        <p className="text-sm text-muted-foreground">Daily workout minutes this week</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={weeklyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
              label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={formatTooltip}
              labelFormatter={(label) => `${label}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
            />
            <Bar 
              dataKey="duration" 
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              className="drop-shadow-sm"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};