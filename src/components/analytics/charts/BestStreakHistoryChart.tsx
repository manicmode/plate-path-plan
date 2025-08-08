import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useWorkoutAnalytics } from '@/hooks/useWorkoutAnalytics';

export const BestStreakHistoryChart = () => {
  const { streaks, isLoading, error } = useWorkoutAnalytics();

  // Mock streak history data - in a real app this would come from the backend
  const streakHistory = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((month, index) => ({
      month,
      streak: Math.floor(Math.random() * 15) + 1 // Mock data
    }));
  }, []);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📈 Best Streak History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📈 Best Streak History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
            <div className="text-4xl mb-2">📊</div>
            <p>Unable to load streak history</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-700 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-purple-900 dark:text-purple-100 flex items-center gap-2">
              📈 Workout Streak History
            </CardTitle>
            <p className="text-sm text-purple-600 dark:text-purple-300 mt-1">Track your consistency over time</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">{streaks.current}</div>
            <div className="text-sm text-purple-500 dark:text-purple-400">current streak</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={streakHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
            <XAxis 
              dataKey="month" 
              stroke="#6366f1"
              fontSize={12}
              fontWeight={500}
            />
            <YAxis 
              stroke="#6366f1"
              fontSize={12}
              fontWeight={500}
              label={{ value: 'Days', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '2px solid #8b5cf6',
                borderRadius: '12px',
                boxShadow: '0 8px 25px rgba(139, 92, 246, 0.2)',
                fontSize: '14px',
                fontWeight: '500'
              }}
              formatter={(value: number) => [`${value} days`, 'Best Streak']}
            />
            <Line 
              type="monotone" 
              dataKey="streak" 
              stroke="url(#purpleGradient)"
              strokeWidth={4}
              dot={{ fill: '#8b5cf6', strokeWidth: 3, r: 5 }}
              activeDot={{ r: 7, stroke: '#7c3aed', strokeWidth: 3, fill: '#a855f7' }}
            />
            <defs>
              <linearGradient id="purpleGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};