import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WorkoutTypesChartProps {
  data: Array<{
    type: string;
    count: number;
    emoji: string;
    color: string;
  }>;
}

export const WorkoutTypesChart = ({ data }: WorkoutTypesChartProps) => {
  return (
    <Card className="w-full shadow-lg border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          📊 Workout Types Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="type" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value, index) => `${data[index]?.emoji} ${value}`}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => [`${value} workouts`, 'Count']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey="count" 
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