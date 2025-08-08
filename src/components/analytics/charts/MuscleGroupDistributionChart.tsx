import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useWorkoutAnalytics } from '@/hooks/useWorkoutAnalytics';

const MUSCLE_GROUP_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7300',
  '#8dd1e1',
];

export const MuscleGroupDistributionChart = () => {
  const { muscleGroupData, isLoading, error } = useWorkoutAnalytics();

  if (isLoading) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            🎯 Muscle Group Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            Loading muscle group data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !muscleGroupData || muscleGroupData.length === 0) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            🎯 Muscle Group Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <div className="text-4xl mb-2">🎯</div>
            <p>No muscle group data yet</p>
            <p className="text-sm">Complete workouts to see muscle group breakdown!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for pie chart
  const chartData = muscleGroupData.map((item) => ({
    name: item.muscle,
    value: item.frequency,
    percentage: ((item.frequency / muscleGroupData.reduce((sum, mg) => sum + mg.frequency, 0)) * 100).toFixed(1)
  }));

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          🎯 Muscle Group Distribution
        </CardTitle>
        <p className="text-sm text-muted-foreground">Training time breakdown this month</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percentage }) => `${name}: ${percentage}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={MUSCLE_GROUP_COLORS[index % MUSCLE_GROUP_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: any, name: string) => [`${value} sessions`, name]}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};