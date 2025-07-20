import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, Target, Flame, Star, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DailyScoreCardProps {
  score: number;
  weeklyAverage?: number;
  streak?: number;
  bestScore?: number;
  className?: string;
}

export const DailyScoreCard: React.FC<DailyScoreCardProps> = ({
  score,
  weeklyAverage = 0,
  streak = 0,
  bestScore = 0,
  className
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '🏆';
    if (score >= 80) return '✅';
    if (score >= 70) return '👍';
    if (score >= 60) return '📈';
    return '🎯';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Great';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Work';
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Today's Performance
          </span>
          <Badge variant="outline" className="text-xs bg-gradient-to-r from-gray-800 to-gray-900 text-white flex items-center justify-center h-8 px-4 py-2 rounded-full">
            Daily Score
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-4xl font-bold">
              {getScoreEmoji(score)}
            </span>
            <div>
              <span className={cn("text-4xl font-bold", getScoreColor(score))}>
                {score.toFixed(1)}
              </span>
              <span className="text-muted-foreground text-lg ml-1">/ 100</span>
            </div>
          </div>
          <p className={cn("text-lg font-medium", getScoreColor(score))}>
            {getScoreLabel(score)}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progress</span>
            <span>{score.toFixed(1)}%</span>
          </div>
          <Progress 
            value={score} 
            className="h-3"
            style={{
              background: `linear-gradient(to right, 
                hsl(var(--destructive)) 0%, 
                hsl(var(--warning)) 25%, 
                hsl(var(--warning)) 50%, 
                hsl(var(--success)) 75%, 
                hsl(var(--success)) 100%)`
            }}
          />
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">Weekly Avg</span>
            </div>
            <p className="text-sm font-semibold">
              {weeklyAverage.toFixed(1)}
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Flame className="h-3 w-3" />
              <span className="text-xs">Streak</span>
            </div>
            <p className="text-sm font-semibold">
              {streak} days
            </p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Star className="h-3 w-3" />
              <span className="text-xs">Best</span>
            </div>
            <p className="text-sm font-semibold">
              {bestScore.toFixed(1)}
            </p>
          </div>
        </div>

        {/* Achievement Badges */}
        {(score >= 90 || streak >= 7 || bestScore >= 95) && (
          <div className="pt-2 border-t">
            <div className="flex flex-wrap gap-2 justify-center">
              {score >= 90 && (
                <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  <Award className="h-3 w-3 mr-1" />
                  Daily Excellence
                </Badge>
              )}
              {streak >= 7 && (
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                  <Flame className="h-3 w-3 mr-1" />
                  Week Streak
                </Badge>
              )}
              {bestScore >= 95 && (
                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                  <Trophy className="h-3 w-3 mr-1" />
                  Near Perfect
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};