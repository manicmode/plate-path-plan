import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Flame, Target, Calendar } from 'lucide-react';

interface StreakTrackerCardProps {
  currentStreak: number;
  longestStreak: number;
  weeklyGoal: number;
  thisWeekWorkouts: number;
}

export const StreakTrackerCard = ({ 
  currentStreak, 
  longestStreak, 
  weeklyGoal, 
  thisWeekWorkouts 
}: StreakTrackerCardProps) => {
  const weeklyProgress = Math.min((thisWeekWorkouts / weeklyGoal) * 100, 100);

  return (
    <Card className="w-full shadow-lg bg-card dark:!border-2 dark:!border-purple-500/60 dark:bg-gradient-to-r dark:from-purple-500/30 dark:to-violet-500/30">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          🔥 Streak Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-2">
          {/* Current Streak */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-full">
                <Flame className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold text-foreground">{currentStreak}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">days</p>
            </div>
          </div>

          {/* Longest Streak */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Personal Best</p>
                <p className="text-2xl font-bold text-foreground">{longestStreak}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">days</p>
            </div>
          </div>

          {/* Weekly Goal Progress */}
          <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">This Week's Goal</p>
                <p className="text-lg font-bold text-foreground">{thisWeekWorkouts}/{weeklyGoal} workouts</p>
              </div>
            </div>
            <Progress value={weeklyProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {weeklyProgress >= 100 ? '🎉 Goal achieved!' : `${Math.round(weeklyProgress)}% complete`}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};