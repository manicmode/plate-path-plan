import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// Recovery items available for selection
const RECOVERY_ITEMS = [
  'Meditation',
  'Breathing',
  'Yoga',
  'Sleep Prep',
  'Cold & Heat Therapy',
] as const;

type RecoveryItem = typeof RECOVERY_ITEMS[number];

type ViewType = '7d' | '4w' | '12m';

interface DataPoint {
  label: string;
  current: number;
  previous: number;
}

// Simple deterministic pseudo-random generator so charts stay stable per selection
function seedFromString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => {
    h += 0x6D2B79F5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function isMinutesMetric(item: RecoveryItem) {
  return item === 'Sleep Prep' || item === 'Cold & Heat Therapy';
}

function buildLabels(view: ViewType): string[] {
  if (view === '7d') {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days;
  }
  if (view === '4w') {
    return ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
  }
  // 12m
  const now = new Date();
  const months = [] as string[];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleString(undefined, { month: 'short' }));
  }
  return months;
}

function generateSeries(item: RecoveryItem, view: ViewType): DataPoint[] {
  const rng = seedFromString(`${item}-${view}`);
  const labels = buildLabels(view);
  const minutesMode = isMinutesMetric(item);

  return labels.map((label, i) => {
    // baseline ranges tuned per granularity and metric
    const base = view === '12m' ? 6 : view === '4w' ? 4 : 2.5;
    const variance = view === '12m' ? 4 : view === '4w' ? 3 : 2;
    const sessions = Math.max(0, Math.round(base + variance * rng() + (i % 3 === 0 ? 1 : 0)));

    // minutes approx per session
    const avgMinutes = item === 'Yoga' ? 35 : item === 'Meditation' ? 15 : item === 'Breathing' ? 10 : item === 'Sleep Prep' ? 25 : 8;

    const current = minutesMode ? sessions * avgMinutes : sessions;

    // previous period with slight variation
    const previousDelta = (rng() - 0.5) * (minutesMode ? avgMinutes * 1.2 : 1.5);
    const previousRaw = current + previousDelta;

    return {
      label,
      current: Math.max(0, Math.round(previousRaw + (rng() - 0.5) * (minutesMode ? avgMinutes * 0.6 : 1)) - Math.round(previousDelta)),
      previous: Math.max(0, Math.round(previousRaw)),
    };
  });
}

export const RecoveryActivityTrends: React.FC = () => {
  const [item, setItem] = useState<RecoveryItem>('Meditation');
  const [view, setView] = useState<ViewType>('7d');

  const data = useMemo(() => generateSeries(item, view), [item, view]);
  const minutesMode = isMinutesMetric(item);

  const yAxisLabel = minutesMode ? 'Minutes' : 'Sessions';

  return (
    <Card className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-lg mb-0 !mb-0">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Controls (no inner title to avoid duplication with SectionHeader) */}
          <div className="flex items-center gap-2">
            <Select value={item} onValueChange={(v) => setItem(v as RecoveryItem)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select recovery" />
              </SelectTrigger>
              <SelectContent>
                {RECOVERY_ITEMS.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={view} onValueChange={(v) => setView(v as ViewType)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="4w">Last 4 Weeks</SelectItem>
                <SelectItem value="12m">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.2)" />
              <XAxis dataKey="label" tick={{ fill: 'currentColor', fontSize: 12 }} />
              <YAxis tick={{ fill: 'currentColor', fontSize: 12 }} label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'currentColor' }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const cur = payload.find((p) => p.dataKey === 'current')?.value as number;
                    const prev = payload.find((p) => p.dataKey === 'previous')?.value as number;
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600">
                        <p className="text-gray-900 dark:text-white font-medium">{label}</p>
                        <p className="text-sm" style={{ color: 'hsl(var(--primary))' }}>Current: {cur} {minutesMode ? 'min' : ''}</p>
                        <p className="text-sm" style={{ color: 'hsl(var(--secondary))' }}>Previous: {prev} {minutesMode ? 'min' : ''}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 8 }} />
              <Bar dataKey="current" name="Current" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
              <Bar dataKey="previous" name="Previous" radius={[6, 6, 0, 0]} fill="hsl(var(--secondary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
