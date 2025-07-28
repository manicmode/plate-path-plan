import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatItemProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: string;
}

interface ExerciseStatsCardProps {
  stats: StatItemProps[];
}

const StatItem = ({ icon: Icon, label, value, color }: StatItemProps) => (
  <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-all duration-200">
    <div className={`p-2 rounded-full bg-gradient-to-br ${color}`}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div className="flex-1">
      <p className="text-sm text-muted-foreground font-medium">{label}</p>
      <p className="text-lg font-bold text-foreground">{value}</p>
    </div>
  </div>
);

export const ExerciseStatsCard = ({ stats }: ExerciseStatsCardProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              📊 Workout Stats
            </h3>
            <div className="px-3 py-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-semibold rounded-full shadow-sm">
              🔥 You're Crushing It!
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <StatItem key={index} {...stat} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};