
import React, { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { EnhancedDailyAverageCard } from '@/components/analytics/EnhancedDailyAverageCard';
import { TrendingUp, ChevronDown, Flame, Zap, Activity, Droplets, Star } from 'lucide-react';
import { useAuth } from '@/contexts/auth';

interface DailyAveragesSectionProps {
  weeklyAverage: any;
}

export const DailyAveragesSection = ({ weeklyAverage }: DailyAveragesSectionProps) => {
  const { user } = useAuth();
  const [isDailyAveragesOpen, setIsDailyAveragesOpen] = useState(false);

  return (
    <div className="mb-16">
      <Collapsible open={isDailyAveragesOpen} onOpenChange={setIsDailyAveragesOpen}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-3 mb-6 cursor-pointer group hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl p-3 -m-3 transition-all duration-200">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl shadow-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Daily Averages</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your weekly performance overview</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {isDailyAveragesOpen ? 'Collapse' : 'Expand'}
              </span>
              <ChevronDown className={`h-5 w-5 text-gray-600 dark:text-gray-400 transition-all duration-300 group-hover:text-blue-500 ${isDailyAveragesOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="overflow-hidden p-3">
          <div className="flex flex-col gap-1">
            <EnhancedDailyAverageCard
              title="Avg Daily Calories"
              value={weeklyAverage.calories}
              suffix=" kcal"
              icon={<Flame className="h-6 w-6" />}
              gradientFrom="#F97316"
              gradientTo="#FB923C"
              progress={Math.round((weeklyAverage.calories / (user?.targetCalories || 2000)) * 100)}
              target={user?.targetCalories || 2000}
              isCompact={true}
            />
            <EnhancedDailyAverageCard
              title="Avg Daily Protein"
              value={weeklyAverage.protein}
              suffix="g"
              icon={<Zap className="h-6 w-6" />}
              gradientFrom="#10B981"
              gradientTo="#34D399"
              progress={Math.round((weeklyAverage.protein / (user?.targetProtein || 120)) * 100)}
              target={user?.targetProtein || 120}
              isCompact={true}
            />
            <EnhancedDailyAverageCard
              title="Avg Daily Carbs"
              value={weeklyAverage.carbs}
              suffix="g"
              icon={<Activity className="h-6 w-6" />}
              gradientFrom="#F59E0B"
              gradientTo="#FBBF24"
              progress={Math.round((weeklyAverage.carbs / (user?.targetCarbs || 250)) * 100)}
              target={user?.targetCarbs || 250}
              isCompact={true}
            />
            <EnhancedDailyAverageCard
              title="Avg Daily Fat"
              value={weeklyAverage.fat}
              suffix="g"
              icon={<Droplets className="h-6 w-6" />}
              gradientFrom="#8B5CF6"
              gradientTo="#A78BFA"
              progress={Math.round((weeklyAverage.fat / (user?.targetFat || 70)) * 100)}
              target={user?.targetFat || 70}
              isCompact={true}
            />
            <EnhancedDailyAverageCard
              title="Avg Daily Hydration"
              value={weeklyAverage.hydration}
              suffix="ml"
              icon={<Droplets className="h-6 w-6" />}
              gradientFrom="#06B6D4"
              gradientTo="#22D3EE"
              progress={Math.round((weeklyAverage.hydration / (user?.targetHydration || 2000)) * 100)}
              target={user?.targetHydration || 2000}
              isCompact={true}
            />
            <EnhancedDailyAverageCard
              title="Avg Daily Steps"
              value={weeklyAverage.steps}
              suffix=""
              icon={<Activity className="h-6 w-6" />}
              gradientFrom="#3B82F6"
              gradientTo="#60A5FA"
              progress={Math.round((weeklyAverage.steps / 10000) * 100)}
              target={10000}
              isCompact={true}
            />
            <EnhancedDailyAverageCard
              title="Avg Exercise Minutes"
              value={weeklyAverage.exerciseMinutes}
              suffix=" min"
              icon={<Flame className="h-6 w-6" />}
              gradientFrom="#EF4444"
              gradientTo="#F87171"
              progress={Math.round((weeklyAverage.exerciseMinutes / 60) * 100)}
              target={60}
              isCompact={true}
            />
            <EnhancedDailyAverageCard
              title="Avg Daily Supplements"
              value={weeklyAverage.supplements}
              suffix=""
              icon={<Star className="h-6 w-6" />}
              gradientFrom="#EC4899"
              gradientTo="#F472B6"
              progress={Math.round((weeklyAverage.supplements / 5) * 100)}
              target={5}
              isCompact={true}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
