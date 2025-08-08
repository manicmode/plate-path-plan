import { addDays, format, startOfWeek, subWeeks, subMonths } from 'date-fns';

export type Period = 'daily' | 'weekly' | 'monthly';

export interface BucketSpec {
  key: string; // e.g., YYYY-MM-DD or YYYY-MM
  label: string; // display label for X axis
  fullLabel: string; // for tooltip
}

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function buildTimeBuckets(period: Period, endDate: Date = new Date()): BucketSpec[] {
  if (period === 'daily') {
    // last 7 days ending today
    const buckets: BucketSpec[] = [];
    const start = addDays(endDate, -6);
    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const dayIdx = d.getDay(); // 0 Sun ... 6 Sat
      const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      buckets.push({ key: toYmd(d), label: letters[dayIdx], fullLabel: format(d, "EEE • MMM dd") });
    }
    return buckets;
  }

  if (period === 'weekly') {
    // last 4 weeks, current week = week 4
    const buckets: BucketSpec[] = [];
    const endWeekStart = startOfWeek(endDate, { weekStartsOn: 1 }); // Monday
    for (let i = 3; i >= 0; i--) {
      const wkStart = addDays(endWeekStart, -7 * i);
      buckets.push({
        key: toYmd(wkStart),
        label: `Wk ${4 - i}`,
        fullLabel: `Week of ${format(wkStart, 'MMM dd, yyyy')}`,
      });
    }
    return buckets;
  }

  // monthly
  const buckets: BucketSpec[] = [];
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
  for (let i = 11; i >= 0; i--) {
    const m = subMonths(endMonth, i);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    const label = format(m, 'LLL');
    const fullLabel = format(m, 'LLLL yyyy');
    buckets.push({ key, label, fullLabel });
  }
  return buckets;
}

export function zeroFill<T extends Record<string, any>>(
  buckets: BucketSpec[],
  data: T[],
  opts: { keyOf: (row: T) => string; valueOf: (row: T) => number }
) {
  const map = new Map<string, number>();
  for (const row of data) {
    const k = opts.keyOf(row);
    const v = opts.valueOf(row);
    map.set(k, (map.get(k) || 0) + (isFinite(v) ? v : 0));
  }
  return buckets.map((b) => ({ key: b.key, label: b.label, fullLabel: b.fullLabel, value: map.get(b.key) ?? 0 }));
}
