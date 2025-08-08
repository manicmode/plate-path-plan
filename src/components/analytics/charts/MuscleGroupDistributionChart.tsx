import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useMuscleGroupTrends } from '@/hooks/useMuscleGroupTrends';

const COLORS = [
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan  
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f97316', // Orange
  '#84cc16'  // Lime
];

export const MuscleGroupDistributionChart = () => {
  const { trendData, loading, error } = useMuscleGroupTrends();

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 Muscle Group Distribution
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

  if (error || !trendData?.muscleGroupSummary || trendData.muscleGroupSummary.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 Muscle Group Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <div className="text-4xl mb-2">🏋️‍♂️</div>
            <p>No muscle group data yet</p>
            <p className="text-sm">Complete workouts to see muscle group distribution!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = trendData.muscleGroupSummary.map((group) => ({
    name: group.muscleGroup,
    value: group.totalSets,
    percentage: Math.round((group.totalSets / trendData.muscleGroupSummary.reduce((sum, g) => sum + g.totalSets, 0)) * 100)
  }));

  return (
    <Card className="w-full bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-700 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-red-900 dark:text-red-100 flex items-center gap-2">
              🎯 Muscle Group Distribution
            </CardTitle>
            <p className="text-sm text-red-600 dark:text-red-300 mt-1">Training focus this month</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '2px solid #ef4444',
                borderRadius: '12px',
                boxShadow: '0 8px 25px rgba(239, 68, 68, 0.2)',
                fontSize: '14px',
                fontWeight: '500'
              }}
              formatter={(value: number, name: string, props: any) => [
                `${value} sets (${props.payload.percentage}%)`, 
                props.payload.name
              ]}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{ 
                fontSize: '14px', 
                fontWeight: '500',
                color: '#1f2937'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};