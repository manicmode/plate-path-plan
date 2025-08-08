
import React from 'react';
import { DailyProgressCard } from '@/components/analytics/DailyProgressCard';
import { Flame, Zap, Droplets, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/auth';

interface DailyProgressSectionProps {
  progress: any;
  weeklyAverage: any;
}

export const DailyProgressSection = ({ progress, weeklyAverage }: DailyProgressSectionProps) => {
  const { user } = useAuth();

  return (
    <div className="grid grid-cols-2 gap-4">
      <DailyProgressCard
        title="Calories"
        value={progress.calories}
        target={user?.targetCalories || 2000}
        unit="kcal"
        icon={<Flame className="h-6 w-6" />}
        color="#F97316"
      />
      <DailyProgressCard
        title="Protein"
        value={progress.protein}
        target={user?.targetProtein || 120}
        unit="g"
        icon={<Zap className="h-6 w-6" />}
        color="#10B981"
      />
    </div>
  );
};
