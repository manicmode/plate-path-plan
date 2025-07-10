import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ExerciseProgressSectionProps {
  className?: string;
}

export const ExerciseProgressSection = ({ className }: ExerciseProgressSectionProps) => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');

  // Mock data for different time ranges
  const getDayData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, index) => ({
      name: day,
      workouts: Math.floor(Math.random() * 2), // 0-1 workouts per day
      duration: Math.floor(Math.random() * 60) + 30, // 30-90 minutes
    }));
  };

  const getWeekData = () => {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    return weeks.map((week) => ({
      name: week,
      workouts: Math.floor(Math.random() * 4) + 2, // 2-5 workouts per week
      duration: Math.floor(Math.random() * 200) + 150, // Average 150-350 minutes
    }));
  };

  const getMonthData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.slice(0, 12).map((month) => ({
      name: month,
      workouts: Math.floor(Math.random() * 12) + 8, // 8-20 workouts per month
      duration: Math.floor(Math.random() * 600) + 400, // Average 400-1000 minutes
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
      case 'day': return 'Daily Exercise (Last 7 Days)';
      case 'week': return 'Weekly Exercise Sessions';
      case 'month': return 'Monthly Exercise Summary';
      default: return 'Daily Exercise';
    }
  };

  const getYAxisLabel = () => {
    switch (timeRange) {
      case 'day': return 'Sessions';
      case 'week': return 'Sessions per Week';
      case 'month': return 'Sessions per Month';
      default: return 'Sessions';
    }
  };

  return (
    <Card className={`modern-tracker-card ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
            🔥 {getTitle()}
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
                label={{ value: getYAxisLabel(), angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--card-foreground))',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'workouts') {
                    return [`${value} sessions`, 'Exercise Sessions'];
                  }
                  return [`${value} minutes`, 'Total Duration'];
                }}
              />
              <Bar 
                dataKey="workouts" 
                fill="hsl(0, 72%, 51%)"
                radius={[4, 4, 0, 0]}
                className="hover:opacity-80 transition-opacity"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            Target: 3-4 exercise sessions per week
          </p>
        </div>
      </CardContent>
    </Card>
  );
};