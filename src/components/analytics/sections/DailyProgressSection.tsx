import React, { useState } from 'react';
import { DailyProgressCard } from '@/components/analytics/DailyProgressCard';
import { Flame, Zap, Droplets, Activity, Wheat, Leaf } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { TrackerInsightsPopup } from '@/components/tracker-insights/TrackerInsightsPopup';

interface DailyProgressSectionProps {
  progress: any;
  weeklyAverage: any;
}

export const DailyProgressSection = ({ progress, weeklyAverage }: DailyProgressSectionProps) => {
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [tracker, setTracker] = useState<{ type: string; name: string; color: string } | null>(null);

  const openChart = (type: string, name: string, color: string) => {
    setTracker({ type, name, color });
    setIsOpen(true);
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      <DailyProgressCard
        title="Calories"
        value={progress.calories || 0}
        target={user?.targetCalories || 2000}
        unit="kcal"
        icon={<Flame className="h-6 w-6" />}
        color="#F97316"
        onClick={() => openChart('calories', 'Calories', '#F97316')}
      />
      <DailyProgressCard
        title="Protein"
        value={progress.protein || 0}
        target={user?.targetProtein || 120}
        unit="g"
        icon={<Zap className="h-6 w-6" />}
        color="#10B981"
        onClick={() => openChart('protein', 'Protein', '#10B981')}
      />
      <DailyProgressCard
        title="Carbs"
        value={progress.carbs || 0}
        target={user?.targetCarbs || 250}
        unit="g"
        icon={<Wheat className="h-6 w-6" />}
        color="#3B82F6"
        onClick={() => openChart('carbs', 'Carbs', '#3B82F6')}
      />
      <DailyProgressCard
        title="Fat"
        value={progress.fat || 0}
        target={user?.targetFat || 65}
        unit="g"
        icon={<Activity className="h-6 w-6" />}
        color="#EF4444"
        onClick={() => openChart('fat', 'Fat', '#EF4444')}
      />
      <DailyProgressCard
        title="Fiber"
        value={progress.fiber || 0}
        target={25}
        unit="g"
        icon={<Leaf className="h-6 w-6" />}
        color="#8B5CF6"
        onClick={() => openChart('fiber', 'Fiber', '#8B5CF6')}
      />
      <DailyProgressCard
        title="Water"
        value={progress.water || 0}
        target={2000}
        unit="ml"
        icon={<Droplets className="h-6 w-6" />}
        color="#06B6D4"
        onClick={() => openChart('hydration', 'Hydration', '#06B6D4')}
      />

      {tracker && (
        <TrackerInsightsPopup
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          trackerType={tracker.type}
          trackerName={tracker.name}
          trackerColor={tracker.color}
        />
      )}
    </div>
  );
};
