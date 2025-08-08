import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';

interface WorkoutFrequencyChartProps {
  data: Array<{
    day: string;
    workouts: number;
    calories: number;
    duration: number;
  }>;
}

// Map various day labels to canonical 1–2 letter codes
const normalizeDayLabel = (label: string) => {
  const v = label.toLowerCase();
  if (v.startsWith('mon') || v === 'm' || v === 'mo') return 'M';
  if (v.startsWith('tue') || v === 't' || v === 'tu' || v.startsWith('tues')) return 'T';
  if (v.startsWith('wed') || v === 'w' || v === 'we') return 'W';
  if (v.startsWith('thu') || v === 'th' || v.startsWith('thur')) return 'Th';
  if (v.startsWith('fri') || v === 'f' || v === 'fr') return 'F';
  if (v.startsWith('sat') || v === 'sa') return 'Sa';
  if (v.startsWith('sun') || v === 'su') return 'Su';
  return label;
};

const dayCodeFromDate = (d: Date) => ['Su','M','T','W','Th','F','Sa'][d.getDay()];

const getLast7Days = () => {
  const today = new Date();
  today.setHours(0,0,0,0);
  const days: { date: Date; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({ date: d, label: dayCodeFromDate(d) });
  }
  return days;
};

export const WorkoutFrequencyChart = ({ data }: WorkoutFrequencyChartProps) => {
  // Build a quick lookup from incoming data by normalized day label
  const lookup = new Map<string, { workouts: number; calories: number; duration: number }>();
  data.forEach((d) => {
    lookup.set(normalizeDayLabel(d.day), { workouts: d.workouts ?? 0, calories: d.calories ?? 0, duration: d.duration ?? 0 });
  });

  const chartData = getLast7Days().map(({ date, label }) => {
    const v = lookup.get(label) || { workouts: 0, calories: 0, duration: 0 };
    return {
      label,
      dateISO: date.toISOString(),
      workouts: v.workouts,
      calories: v.calories,
      duration: v.duration,
    };
  });

  return (
    <Card className="w-full shadow-lg bg-card dark:!border-2 dark:!border-green-500/60 dark:bg-gradient-to-r dark:from-green-500/30 dark:to-emerald-500/30">
      <CardContent className="p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            📊 Weekly Workout Frequency
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="label" 
                  interval={0}
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value} workouts`, 'Workouts']}
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
                <Bar 
                  dataKey="workouts" 
                  radius={[4, 4, 0, 0]}
                  fill="hsl(var(--primary))"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};