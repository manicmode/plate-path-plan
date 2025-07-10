import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StepsProgressSectionProps {
  className?: string;
}

export const StepsProgressSection = ({ className }: StepsProgressSectionProps) => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');

  // Mock data for different time ranges
  const getDayData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, index) => ({
      name: day,
      steps: Math.floor(Math.random() * 5000) + 3000, // 3000-8000 steps
    }));
  };

  const getWeekData = () => {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    return weeks.map((week) => ({
      name: week,
      steps: Math.floor(Math.random() * 3000) + 6000, // Average 6000-9000 steps
    }));
  };

  const getMonthData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.slice(0, 12).map((month) => ({
      name: month,
      steps: Math.floor(Math.random() * 4000) + 5000, // Average 5000-9000 steps
    }));
  };

  const getData = () => {
    switch (timeRange) {
      case 'day': return getDayData();
      case 'week': return getWeekData();
      case 'month': return getMonthData();
      default: return getDayData();
    }
  };

  const getTitle = () => {
    switch (timeRange) {
      case 'day': return 'Daily Steps (Last 7 Days)';
      case 'week': return 'Weekly Average Steps';
      case 'month': return 'Monthly Average Steps';
      default: return 'Daily Steps';
    }
  };

  return (
    <Card className={`modern-tracker-card ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
            👟 {getTitle()}
          </CardTitle>
          <div className="flex space-x-2">
            {(['day', 'week', 'month'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className="capitalize"
              >
                {range === 'day' ? 'Days' : range === 'week' ? 'Weeks' : 'Months'}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={getData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
                domain={[0, 10000]}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--card-foreground))',
                }}
                formatter={(value: number) => [`${value.toLocaleString()} steps`, 'Steps']}
              />
              <Bar 
                dataKey="steps" 
                fill="hsl(174, 100%, 39%)"
                radius={[4, 4, 0, 0]}
                className="hover:opacity-80 transition-opacity"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Goal: 10,000 steps per day
          </p>
        </div>
      </CardContent>
    </Card>
  );
};