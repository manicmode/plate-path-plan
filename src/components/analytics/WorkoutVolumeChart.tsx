import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';

interface WorkoutVolumeChartProps {
  className?: string;
}

export const WorkoutVolumeChart = ({ className }: WorkoutVolumeChartProps) => {
  const { weeklyChartData } = useRealExerciseData('30d');

  // Format data for the chart
  const chartData = weeklyChartData.map((day) => ({
    day: day.day,
    minutes: day.duration,
    calories: day.calories,
  }));

  // Calculate averages
  const avgMinutes = Math.round(chartData.reduce((sum, day) => sum + day.minutes, 0) / chartData.length);
  const totalMinutes = chartData.reduce((sum, day) => sum + day.minutes, 0);
  const workoutDays = chartData.filter(day => day.minutes > 0).length;

  return (
    <Card className={`shadow-lg border-border bg-card dark:!border-2 dark:!border-green-500/60 dark:bg-gradient-to-r dark:from-green-500/30 dark:to-emerald-500/30 ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          📊 Weekly Training Volume
        </CardTitle>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{totalMinutes}</div>
            <div className="text-muted-foreground">Total Minutes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{workoutDays}</div>
            <div className="text-muted-foreground">Days Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{avgMinutes}</div>
            <div className="text-muted-foreground">Avg/Session</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="day" 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value} ${name === 'minutes' ? 'min' : 'kcal'}`, 
                  name === 'minutes' ? 'Duration' : 'Calories'
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey="minutes" 
                radius={[4, 4, 0, 0]}
                fill="hsl(var(--primary))"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};