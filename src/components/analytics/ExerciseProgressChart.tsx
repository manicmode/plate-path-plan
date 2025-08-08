import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

interface ExerciseProgressChartProps {
  data: Array<{
    date: string;
    duration: number;
  }>;
}

const toMidnight = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const dayCodeFromDate = (d: Date) => ['Su','M','T','W','Th','F','Sa'][d.getDay()];
const getLast7Days = () => {
  const today = toMidnight(new Date());
  const out: Date[] = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(today.getDate() - i); out.push(d); }
  return out;
};

export const ExerciseProgressChart = ({ data }: ExerciseProgressChartProps) => {
  // Build lookup by YYYY-MM-DD key in local time
  const byKey = new Map<string, number>();
  data.forEach((d) => {
    const date = toMidnight(new Date(d.date));
    const key = date.toISOString().slice(0,10);
    byKey.set(key, d.duration ?? 0);
  });

  const chartData = getLast7Days().map((d) => {
    const key = d.toISOString().slice(0,10);
    return {
      label: dayCodeFromDate(d),
      dateISO: d.toISOString(),
      duration: byKey.get(key) ?? 0,
    };
  });

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
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="label" 
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value} min`, 'Duration']}
                  labelFormatter={(_, payload) => {
                    const p = payload && payload[0]?.payload;
                    const d = p?.dateISO ? new Date(p.dateISO) : null;
                    return d ? format(d, 'EEE • MMM dd') : '';
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