
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Flame, Target, ChevronRight } from 'lucide-react';
import { SectionHeader } from '@/components/analytics/ui/SectionHeader';

export const AchievementsSection = () => {
  return (
    <div>
      <SectionHeader icon={Trophy} title="Milestones & Streaks" subtitle="Your achievements and consistency" />
      <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border border-emerald-200 dark:border-emerald-700/50 shadow-sm">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <Flame className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">9-Day Streak</div>
                <div className="text-sm text-emerald-700 dark:text-emerald-300">Consistency Champion</div>
              </div>
              <ChevronRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400 ml-auto" />
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-700/50 shadow-sm">
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <Target className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">5/7 Days</div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Protein Goals Hit</div>
              </div>
              <ChevronRight className="h-5 w-5 text-blue-600 dark:text-blue-400 ml-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
