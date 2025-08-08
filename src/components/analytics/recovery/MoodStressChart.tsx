import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface MoodStressData {
  day: string;
  mood: number;
  stress: number;
}

export const MoodStressChart = () => {
  const isMobile = useIsMobile();
  const [data, setData] = useState<MoodStressData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock data generation
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const mockData = days.map(day => ({
      day,
      mood: Math.floor(Math.random() * 4) + 6, // 6-10 scale
      stress: Math.floor(Math.random() * 4) + 2, // 2-6 scale
    }));
    
    setTimeout(() => {
      setData(mockData);
      setIsLoading(false);
    }, 600);
  }, []);

  if (isLoading) {
    return (
      <Card className="glass-card border-0 rounded-3xl animate-fade-in">
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-0 rounded-3xl animate-fade-in">
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <TrendingUp className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
          <span>📈 Mood & Stress Trends</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis 
                dataKey="day" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis 
                domain={[0, 10]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number, name: string) => [
                  `${value}/10`,
                  name === 'mood' ? 'Mood' : 'Stress'
                ]}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="mood" 
                stroke="hsl(192 100% 45%)" 
                strokeWidth={2}
                dot={{ fill: 'hsl(192 100% 45%)', strokeWidth: 2, r: 4 }}
                name="Mood"
              />
              <Line 
                type="monotone" 
                dataKey="stress" 
                stroke="hsl(14 100% 55%)" 
                strokeWidth={2}
                dot={{ fill: 'hsl(14 100% 55%)', strokeWidth: 2, r: 4 }}
                name="Stress"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary */}
        <div className="mt-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
          <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-blue-700 dark:text-blue-300`}>
            <strong>Weekly Average:</strong> Mood 7.2/10 • Stress 3.8/10
          </p>
        </div>
      </CardContent>
    </Card>
  );
};