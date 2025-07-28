import React from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

interface MuscleGroupRadarChartProps {
  data: Array<{
    muscle: string;
    frequency: number;
    fullMark: number;
  }>;
}

export const MuscleGroupRadarChart = ({ data }: MuscleGroupRadarChartProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            🎯 Muscle Group Coverage
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data}>
                <PolarGrid className="opacity-30" />
                <PolarAngleAxis 
                  tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                  className="text-foreground"
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 'dataMax']} 
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  className="opacity-50"
                />
                <Radar
                  name="Frequency"
                  dataKey="frequency"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value} sessions`, 'Frequency']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};