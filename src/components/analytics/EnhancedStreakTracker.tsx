import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Trophy, Calendar, Target } from 'lucide-react';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';

interface EnhancedStreakTrackerProps {
  className?: string;
}

export const EnhancedStreakTracker = ({ className }: EnhancedStreakTrackerProps) => {
  const { weeklyChartData } = useRealExerciseData('30d');

  // Calculate streaks (simplified logic - would be dynamic in real implementation)
  const currentStreak = weeklyChartData.filter(day => day.duration > 0).length; // Mock calculation based on active days
  const longestStreak = 12; // Mock calculation
  const weeklyGoal = 4;
  const thisWeekWorkouts = weeklyChartData.filter(day => day.duration > 0).length;
  const weeklyProgress = Math.min((thisWeekWorkouts / weeklyGoal) * 100, 100);

  const getStreakMessage = () => {
    if (currentStreak >= 7) return "🔥 You're on fire! Keep it up!";
    if (currentStreak >= 3) return "💪 Great momentum! Don't stop now!";
    if (currentStreak === 0) return "🌟 Ready for a fresh start?";
    return "🎯 Building your streak...";
  };

  const getStreakColor = () => {
    if (currentStreak >= 7) return "from-orange-500 to-red-500";
    if (currentStreak >= 3) return "from-blue-500 to-purple-500";
    return "from-gray-400 to-gray-500";
  };

  return (
    <Card className={`shadow-lg border-border bg-card dark:!border-2 dark:!border-orange-500/60 dark:bg-gradient-to-r dark:from-orange-500/30 dark:to-red-500/30 ${className}`}>
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
          🔥 Workout Streak & Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Streak */}
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r ${getStreakColor()} text-white mb-3`}>
            <div className="text-center">
              <div className="text-2xl font-bold">{currentStreak}</div>
              <div className="text-xs">DAYS</div>
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Current Streak</h3>
          <p className="text-sm text-muted-foreground">{getStreakMessage()}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <div className="text-xl font-bold text-foreground">{longestStreak}</div>
            <div className="text-xs text-muted-foreground">Best Streak</div>
          </div>
          <div className="text-center p-4 bg-muted/30 rounded-lg">
            <Target className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <div className="text-xl font-bold text-foreground">{thisWeekWorkouts}/{weeklyGoal}</div>
            <div className="text-xs text-muted-foreground">Weekly Goal</div>
          </div>
        </div>

        {/* Weekly Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">This Week's Progress</span>
            <Badge variant={weeklyProgress >= 100 ? "default" : "secondary"}>
              {Math.round(weeklyProgress)}%
            </Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${weeklyProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {weeklyProgress >= 100 ? "🎉 Goal achieved!" : `${weeklyGoal - thisWeekWorkouts} more workouts to reach your goal`}
          </p>
        </div>

        {/* Week Overview */}
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            This Week's Activity
          </h4>
          <div className="flex justify-between">
            {weeklyChartData.map((day, index) => (
              <div key={index} className="text-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mb-1
                  ${day.duration > 0 
                    ? 'bg-green-500 text-white' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {day.duration > 0 ? '✓' : '·'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {day.day.slice(0, 1)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};