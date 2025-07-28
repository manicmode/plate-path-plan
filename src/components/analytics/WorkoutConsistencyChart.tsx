import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WorkoutConsistencyChartProps {
  completedWorkouts: number;
  plannedWorkouts: number;
}

export const WorkoutConsistencyChart = ({ completedWorkouts, plannedWorkouts }: WorkoutConsistencyChartProps) => {
  const missedWorkouts = plannedWorkouts - completedWorkouts;
  
  const data = [
    { name: 'Completed', value: completedWorkouts, color: '#10B981' },
    { name: 'Missed', value: Math.max(0, missedWorkouts), color: '#EF4444' }
  ];

  const consistencyPercentage = plannedWorkouts > 0 ? Math.round((completedWorkouts / plannedWorkouts) * 100) : 0;

  return (
    <Card className="w-full shadow-lg bg-card !border-2 !border-teal-500/60 bg-gradient-to-r from-teal-500/30 to-cyan-500/30">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          🔄 Workout Consistency
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{consistencyPercentage}%</div>
              <div className="text-sm text-muted-foreground">Consistency Rate</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-foreground">{completedWorkouts}/{plannedWorkouts}</div>
              <div className="text-sm text-muted-foreground">This Month</div>
            </div>
          </div>
          
          <div className="w-full">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                  startAngle={90}
                  endAngle={450}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number, name: string) => [`${value} workouts`, name]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};