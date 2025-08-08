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
  // Enforce 7-day buckets ending today with zero-fill
  const buckets = React.useMemo(() => {
    const end = new Date();
    const letters = ['S','M','T','W','T','F','S'];
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    const arr: { key: string; label: string; full: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      arr.push({ key, label: letters[d.getDay()], full: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: '2-digit' }) });
    }
    return arr;
  }, []);

  const series = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data || []) {
      const key = row.date?.slice(0,10);
      if (key) map.set(key, (map.get(key) || 0) + (row.duration || 0));
    }
    return buckets.map(b => ({ date: b.key, label: b.label, full: b.full, duration: map.get(b.key) ?? 0 }));
  }, [data, buckets]);

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
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="label" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => [`${value} min`, 'Duration']}
                  labelFormatter={(_label, payload) => {
                    const p = (payload && payload[0] && (payload[0] as any).payload) as any;
                    return p?.full || '';
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