
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <DailyProgressCard
        title="Hydration"
        value={progress.hydration}
        target={user?.targetHydration || 2000}
        unit="ml"
        icon={<Droplets className="h-6 w-6" />}
        color="#06B6D4"
      />
      <DailyProgressCard
        title="Steps"
        value={Math.round(weeklyAverage.steps)}
        target={10000}
        unit="steps"
        icon={<Activity className="h-6 w-6" />}
        color="#22C55E"
      />
    </div>
  );
};
