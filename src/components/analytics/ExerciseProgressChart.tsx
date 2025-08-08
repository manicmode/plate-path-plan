import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExerciseProgressChartProps {
  data: Array<{
    date: string;
    duration: number;
  }>;
}

export const ExerciseProgressChart = ({ data }: ExerciseProgressChartProps) => {
  return (
    <Card className="w-full shadow-lg bg-card dark:!border-2 dark:!border-orange-500/60 dark:bg-gradient-to-r dark:from-orange-500/30 dark:to-amber-500/30">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          📈 Workout Duration Trend
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value} min`, 'Duration']}
                  labelFormatter={(label) => {
                    const date = new Date(label);
                    return date.toLocaleDateString();
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="duration" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};