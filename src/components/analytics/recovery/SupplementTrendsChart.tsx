import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Pill } from 'lucide-react';
import { format, startOfWeek, subWeeks, subMonths } from 'date-fns';

// Types
type ViewType = 'daily' | 'weekly' | 'monthly';

interface DataPoint {
  label: string;
  count: number;
}

// Simple seeded PRNG for consistent demo data
function seedFromString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => (h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909), (h >>> 0) / 4294967296);
}

function generateData(view: ViewType): DataPoint[] {
  const rand = seedFromString(`supplements-${view}`);
  const now = new Date();

  if (view === 'daily') {
    // Exactly last 7 consecutive days ending today
    const points: DataPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      points.push({
        label: format(d, 'EEE'),
        count: Math.round(rand() * 4 + rand() * 2), // 0..6 taken
      });
    }
    return points;
  }

  if (view === 'weekly') {
    // Exactly last 4 consecutive weeks ending current week
    const points: DataPoint[] = [];
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday start
    for (let i = 3; i >= 0; i--) {
      const wkStart = subWeeks(currentWeekStart, i);
      points.push({
        label: `Wk ${format(wkStart, 'MMM d')}`,
        count: Math.round(rand() * 20 + 5),
      });
    }
    return points;
  }

  // Exactly last 12 consecutive months ending current month
  const points: DataPoint[] = [];
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = 11; i >= 0; i--) {
    const m = subMonths(currentMonthStart, i);
    points.push({
      label: format(m, 'MMM'),
      count: Math.round(rand() * 80 + 10),
    });
  }
  return points;
}


export const SupplementTrendsChart: React.FC = () => {
  const [view, setView] = useState<ViewType>('daily');
  const data = useMemo(() => generateData(view), [view]);
  const isEmpty = data.every(d => d.count === 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Pill className="h-5 w-5" />
          </div>
          <CardTitle className="text-base font-semibold">Supplement Trends</CardTitle>
        </div>
        <div className="w-40">
          <Select value={view} onValueChange={(v) => setView(v as ViewType)}>
            <SelectTrigger className="h-8">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent className="z-50">
              <SelectItem value="daily">Daily (7 days)</SelectItem>
              <SelectItem value="weekly">Weekly (4 weeks)</SelectItem>
              <SelectItem value="monthly">Monthly (12 months)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="py-10 text-center text-muted-foreground text-sm">No supplement data to display yet.</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="label" interval={0} tickMargin={8} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" label={{ value: 'Supplements', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v: number) => [`${v} taken`, 'Supplements']} cursor={{ stroke: 'hsl(var(--primary) / 0.3)', strokeWidth: 1 }} />
                <Line type="monotone" dataKey="count" name="Supplements" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
