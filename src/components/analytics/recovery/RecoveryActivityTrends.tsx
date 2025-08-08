import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { useIsMobile } from '@/hooks/use-mobile';

// Recovery categories and brand colors (match app theme)
const RECOVERY_ITEMS = [
  { key: 'meditation', label: 'Meditation', color: 'hsl(262 83% 58%)' }, // purple
  { key: 'breathing', label: 'Breathing', color: 'hsl(192 100% 45%)' }, // teal
  { key: 'yoga', label: 'Yoga', color: 'hsl(158 100% 39%)' }, // green
  { key: 'sleep', label: 'Sleep Prep', color: 'hsl(219 100% 62%)' }, // blue
  { key: 'thermotherapy', label: 'Cold & Heat Therapy', color: 'hsl(14 100% 55%)' }, // orange/red
] as const;

type RecoveryKey = typeof RECOVERY_ITEMS[number]['key'];

type PeriodKey = '7d' | '4w' | '12m';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '7d', label: 'Last 7 Days' },
  { key: '4w', label: 'Last 4 Weeks' },
  { key: '12m', label: 'Last 12 Months' },
];

interface TrendPoint {
  label: string; // day, week or month label
  current: number;
  previous: number;
}

// Simple deterministic pseudo-random generator for stable mock data
const seedRandom = (seed: number) => () => {
  // Mulberry32
  let t = (seed += 0x6D2B79F5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const buildMockData = (item: RecoveryKey, period: PeriodKey): TrendPoint[] => {
  const points = period === '7d' ? 7 : period === '4w' ? 4 : 12;
  const rand = seedRandom(item.length + points);

  const labels = Array.from({ length: points }, (_, i) => {
    if (period === '7d') {
      // last 7 days labels
      const d = new Date();
      d.setDate(d.getDate() - (points - 1 - i));
      return d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
    }
    if (period === '4w') return `W${i + 1}`;
    // 12 months
    const d = new Date();
    d.setMonth(d.getMonth() - (points - 1 - i));
    return d.toLocaleDateString(undefined, { month: 'short' });
  });

  return labels.map((label, idx) => {
    const base = Math.round(2 + rand() * 6); // 2-8 sessions baseline
    const variance = Math.round((rand() - 0.5) * 2); // -1..1
    const current = Math.max(0, base + variance);
    const previous = Math.max(0, base + Math.round((rand() - 0.5) * 3));

    // Slight trend over time for realism
    const trendAdjust = period === '12m' ? Math.round(idx / 4) : period === '4w' ? Math.round(idx / 2) : (idx % 2);

    return {
      label,
      current: Math.max(0, current + trendAdjust),
      previous: Math.max(0, previous),
    } as TrendPoint;
  });
};

export const RecoveryActivityTrends: React.FC = () => {
  const isMobile = useIsMobile();
  const [item, setItem] = useState<RecoveryKey>('meditation');
  const [period, setPeriod] = useState<PeriodKey>('7d');
  const color = RECOVERY_ITEMS.find((i) => i.key === item)!.color;

  const data = useMemo(() => buildMockData(item, period), [item, period]);

  // Decide chart type: bars for weekly/monthly, lines for daily for variety
  const useLine = period === '7d';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const curr = payload.find((p: any) => p.dataKey === 'current')?.value ?? 0;
    const prev = payload.find((p: any) => p.dataKey === 'previous')?.value ?? 0;
    return (
      <div className="bg-background border border-border rounded-lg p-3 shadow-lg text-sm">
        <div className="font-semibold mb-1">{label}</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: color }} /> Current: <span className="font-medium">{curr}</span> sessions</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-muted" /> Previous: <span className="font-medium">{prev}</span> sessions</div>
        </div>
      </div>
    );
  };

  return (
    <Card className="glass-card border-0 rounded-3xl animate-fade-in">
      <CardHeader className={isMobile ? 'pb-3' : 'pb-4'}>
        <CardTitle className={`flex items-center justify-between ${isMobile ? 'text-base' : 'text-lg'}`}>
          <div className="flex items-center gap-2">
            <span className="inline-grid place-items-center p-2 rounded-xl" style={{ background: `${color}20` }}>
              <span className="w-3 h-3 rounded-full" style={{ background: color }} />
            </span>
            <span>📈 Recovery Activity Trends</span>
          </div>
          <div className="hidden sm:flex text-xs text-muted-foreground">Current vs previous period</div>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
        {/* Controls */}
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-3'} mb-4`}>
          <Select value={item} onValueChange={(v) => setItem(v as RecoveryKey)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select Activity" />
            </SelectTrigger>
            <SelectContent>
              {RECOVERY_ITEMS.map((i) => (
                <SelectItem key={i.key} value={i.key}>{i.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {useLine ? (
              <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="current" stroke={color} strokeWidth={3} dot={{ r: 4 }} name="Current" />
                <Line type="monotone" dataKey="previous" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} dot={{ r: 3 }} name="Previous" />
              </LineChart>
            ) : (
              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis tick={{ fontSize: isMobile ? 10 : 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="current" name="Current" fill={color} radius={[8, 8, 0, 0]} />
                <Bar dataKey="previous" name="Previous" fill="#94a3b8" fillOpacity={0.6} radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
