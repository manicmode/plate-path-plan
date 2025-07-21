
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Activity, Flame } from 'lucide-react';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';

export const ActivityExerciseSection = () => {
  const { data: exerciseWeekly, todayTotal } = useRealExerciseData(7);

  const stepsData = exerciseWeekly.map((exercise, index) => ({
    day: index === 6 ? 'Today' : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
    steps: exercise.steps,
  }));

  const exerciseCaloriesData = exerciseWeekly.map((exercise, index) => ({
    day: index === 6 ? 'Today' : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index],
    calories: exercise.calories,
  }));

  const weeklyAverage = {
    steps: exerciseWeekly.reduce((sum, day) => sum + day.steps, 0) / 7,
    exerciseMinutes: exerciseWeekly.reduce((sum, day) => sum + day.duration, 0) / 7
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Steps Chart */}
      <Card className="visible-card shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium flex items-center space-x-2">
            <Activity className="h-4 w-4 text-green-500" />
            <span>Weekly Steps</span>
          </CardTitle>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">{Math.round(weeklyAverage.steps)}</p>
            <p className="text-xs text-gray-500">avg/day</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stepsData}>
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="steps" fill="#22C55E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Calories Chart */}
      <Card className="visible-card shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium flex items-center space-x-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span>Exercise Calories</span>
          </CardTitle>
          <div className="text-right">
            <p className="text-2xl font-bold text-orange-600">{Math.round(weeklyAverage.exerciseMinutes)}</p>
            <p className="text-xs text-gray-500">min/day</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={exerciseCaloriesData}>
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="calories" fill="#F97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
