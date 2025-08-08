import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useWorkoutAnalytics } from '@/hooks/useWorkoutAnalytics';

export const BestStreakHistoryChart = () => {
  const { workoutHistory, streaks, isLoading, error } = useWorkoutAnalytics();

  if (isLoading) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            🔥 Best Streak History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            Loading streak data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !workoutHistory || workoutHistory.length === 0) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            🔥 Best Streak History
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <div className="text-4xl mb-2">🔥</div>
            <p>No streak history yet</p>
            <p className="text-sm">Build consistency to see streak trends!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate monthly streak data for the past 6 months
  const monthlyStreakData = [];
  const currentDate = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthName = targetDate.toLocaleDateString('en-US', { month: 'short' });
    
    // Calculate best streak for that month
    // This is a simplified calculation - in a real app, you'd want to track this more precisely
    const monthlyWorkouts = workoutHistory.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate.getMonth() === targetDate.getMonth() && 
             workoutDate.getFullYear() === targetDate.getFullYear();
    });
    
    // Simple streak calculation for the month
    let bestMonthlyStreak = 0;
    let currentStreak = 0;
    const sortedWorkouts = monthlyWorkouts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let lastWorkoutDate = null;
    for (const workout of sortedWorkouts) {
      const workoutDate = new Date(workout.date);
      if (lastWorkoutDate) {
        const daysDiff = Math.floor((workoutDate.getTime() - lastWorkoutDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 1) {
          currentStreak++;
        } else {
          bestMonthlyStreak = Math.max(bestMonthlyStreak, currentStreak);
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      lastWorkoutDate = workoutDate;
    }
    bestMonthlyStreak = Math.max(bestMonthlyStreak, currentStreak);
    
    monthlyStreakData.push({
      month: monthName,
      streak: bestMonthlyStreak
    });
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          🔥 Best Streak History
        </CardTitle>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Monthly best streaks over time</p>
          <div className="text-right">
            <div className="text-lg font-bold text-primary">{streaks?.longest || 0}</div>
            <div className="text-xs text-muted-foreground">all-time best</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={monthlyStreakData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="month" 
              className="text-xs text-muted-foreground"
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              className="text-xs text-muted-foreground"
              axisLine={false}
              tickLine={false}
              label={{ value: 'Days', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: any) => [`${value} days`, 'Best Streak']}
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
              dataKey="streak" 
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