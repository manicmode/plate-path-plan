import { addDays, format, startOfWeek, subMonths } from 'date-fns';

export type Period = 'daily' | 'weekly' | 'monthly';

export type Bucket = {
  key: string;             // ISO date or yyyy-ww or yyyy-mm
  label: string;           // display label (e.g., "M", "Wk 2", "Aug")
  shortLabel?: string;     // optional extra-short label if needed
  fullLabel: string;       // for tooltip
  value?: number;          // optional data value
  // legacy alias for backward compatibility:
  day?: string;            // alias to label for existing components
};

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildTimeBuckets(period: Period, endDate: Date = new Date()): Bucket[] {
  if (period === 'daily') {
    // last 7 days ending today
    const buckets: Bucket[] = [];
    const start = addDays(endDate, -6);
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const dayIdx = d.getDay(); // 0 Sun ... 6 Sat
      const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const label = letters[dayIdx];
      buckets.push({ key: toYmd(d), label, shortLabel: label, day: label, fullLabel: format(d, "EEE • MMM dd") });
    }
    return buckets;
  }

  if (period === 'weekly') {
    // last 4 weeks, current week = week 4
    const buckets: Bucket[] = [];
    const endWeekStart = startOfWeek(endDate, { weekStartsOn: 1 }); // Monday
    for (let i = 3; i >= 0; i--) {
      const wkStart = addDays(endWeekStart, -7 * i);
      const wkLabel = `Wk ${4 - i}`;
      buckets.push({
        key: toYmd(wkStart),
        label: wkLabel,
        shortLabel: `W${4 - i}`,
        day: wkLabel,
        fullLabel: `Week of ${format(wkStart, 'MMM dd, yyyy')}`,
      });
    }
    return buckets;
  }

  // monthly
  const buckets: Bucket[] = [];
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  for (let i = 11; i >= 0; i--) {
    const m = subMonths(endMonth, i);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    const label = format(m, 'LLL');
    const fullLabel = format(m, 'LLLL yyyy');
    buckets.push({ key, label, shortLabel: label, day: label, fullLabel });
  }
  return buckets;
}

export function zeroFill<T extends Record<string, any>>(
  buckets: Bucket[],
  data: T[],
  opts: { keyOf: (row: T) => string; valueOf: (row: T) => number }
) {
  const map = new Map<string, number>();
  for (const row of data) {
    const k = opts.keyOf(row);
    const v = opts.valueOf(row);
    map.set(k, (map.get(k) || 0) + (isFinite(v) ? v : 0));
  }
  return buckets.map((b) => ({
    key: b.key,
    label: b.label,
    shortLabel: b.shortLabel,
    fullLabel: b.fullLabel,
    day: b.day ?? b.label,
    value: map.get(b.key) ?? 0,
  }));
}

export function withLegacyDay<T extends { label: string }>(row: T): T & { day: string } {
  return Object.assign({ day: (row as any).day ?? row.label }, row);
}
