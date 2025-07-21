
import React from 'react';
import { DailyProgressCard } from '@/components/analytics/DailyProgressCard';
import { Flame, Zap, Droplets, Activity } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useRealNutritionData } from '@/hooks/useRealNutritionData';
import { useRealHydrationData } from '@/hooks/useRealHydrationData';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';

export const DailyProgressSection = () => {
  const { user } = useAuth();
  const { todayTotal: nutritionToday } = useRealNutritionData(1);
  const { todayTotal: hydrationToday } = useRealHydrationData(1);
  const { todayTotal: exerciseToday } = useRealExerciseData(1);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <DailyProgressCard
        title="Calories"
        value={nutritionToday.calories}
        target={user?.targetCalories || 2000}
        unit="kcal"
        icon={<Flame className="h-6 w-6" />}
        color="#F97316"
      />
      <DailyProgressCard
        title="Protein"
        value={nutritionToday.protein}
        target={user?.targetProtein || 120}
        unit="g"
        icon={<Zap className="h-6 w-6" />}
        color="#10B981"
      />
      <DailyProgressCard
        title="Hydration"
        value={hydrationToday}
        target={user?.targetHydration || 2000}
        unit="ml"
        icon={<Droplets className="h-6 w-6" />}
        color="#06B6D4"
      />
      <DailyProgressCard
        title="Steps"
        value={exerciseToday.steps}
        target={10000}
        unit="steps"
        icon={<Activity className="h-6 w-6" />}
        color="#22C55E"
      />
    </div>
  );
};
