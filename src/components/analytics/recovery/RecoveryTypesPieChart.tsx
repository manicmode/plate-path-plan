import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Activity } from 'lucide-react';

interface RecoveryTypeData {
  name: string;
  value: number;
  color: string;
}

export const RecoveryTypesPieChart = () => {
  const isMobile = useIsMobile();
  const [data, setData] = useState<RecoveryTypeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock data for recovery types
    const mockData: RecoveryTypeData[] = [
      { name: 'Meditation', value: 35, color: 'hsl(262 83% 58%)' },
      { name: 'Breathing', value: 28, color: 'hsl(192 100% 45%)' },
      { name: 'Sleep', value: 20, color: 'hsl(219 100% 62%)' },
      { name: 'Yoga', value: 12, color: 'hsl(158 100% 39%)' },
      { name: 'Thermotherapy', value: 5, color: 'hsl(14 100% 55%)' },
    ];
    
    setTimeout(() => {
      setData(mockData);
      setIsLoading(false);
    }, 700);
  }, []);

  if (isLoading) {
    return (
      <Card className="glass-card border-0 rounded-3xl animate-fade-in">
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto w-48"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderCustomTooltip = (props: any) => {
    const { active, payload } = props;
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
          <p className="text-sm font-medium">{data.name}</p>
          <p className="text-sm text-muted-foreground">{data.value}% of sessions</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="glass-card border-0 rounded-3xl animate-fade-in">
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
        <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
          <Activity className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-blue-600`} />
          <span>🥧 Recovery Practice Breakdown</span>
        </CardTitle>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={renderCustomTooltip} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: item.color }}
              ></div>
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                {item.name} ({item.value}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};