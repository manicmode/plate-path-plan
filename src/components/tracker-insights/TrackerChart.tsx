import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface TrackerChartProps {
  data: any[];
  loading: boolean;
  error: string | null;
  viewType: 'DAY' | 'WEEK' | 'MONTH';
  trackerColor: string;
  trackerName: string;
}

const TRACKER_COLORS = {
  'Calories': '#f97316',
  'Protein': '#3b82f6',
  'Carbs': '#f59e0b',
  'Fat': '#10b981',
  'Hydration': '#06b6d4',
  'Supplements': '#8b5cf6',
  'Fiber': '#22c55e',
  'Micronutrients': '#6366f1',
  'Inflammatory.F': '#ef4444',
  'Artificial.S': '#84cc16',
  'Preservatives': '#3b82f6',
  'Dyes': '#f59e0b',
  'Seed Oils': '#22c55e',
  'GMOs': '#8b5cf6',
};

export const TrackerChart = ({ 
  data, 
  loading, 
  error, 
  viewType, 
  trackerColor, 
  trackerName 
}: TrackerChartProps) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-medium">No data available</p>
          <p className="text-sm">Start tracking to see your {trackerName.toLowerCase()} trends</p>
        </div>
      </div>
    );
  }

  const chartColor = TRACKER_COLORS[trackerName] || trackerColor || '#6366f1';

  const getViewDescription = () => {
    switch (viewType) {
      case 'DAY':
        return 'Daily values for the past 7 days';
      case 'WEEK':
        return 'Weekly averages for the past 4 weeks';
      case 'MONTH':
        return 'Monthly averages';
      default:
        return '';
    }
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (trackerName === 'Hydration') {
      return [`${value} ml`, name];
    }
    if (trackerName.includes('.F') || trackerName.includes('.S') || trackerName === 'Preservatives' || trackerName === 'Dyes' || trackerName === 'GMOs') {
      return [`${value} servings`, name];
    }
    if (trackerName === 'Supplements') {
      return [`${value} supplements`, name];
    }
    if (trackerName === 'Micronutrients') {
      return [`${value}%`, name];
    }
    if (trackerName === 'Steps') {
      return [`${value.toLocaleString()} steps`, name];
    }
    if (trackerName === 'Exercise') {
      return [`${value} calories`, name];
    }
    return [`${value}g`, name];
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        {getViewDescription()}
      </div>
      
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="label" 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '12px',
              }}
              formatter={formatTooltipValue}
            />
            <Bar 
              dataKey="value" 
              fill={chartColor}
              radius={[4, 4, 0, 0]}
              name={trackerName}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};