import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Calendar, Target, Lightbulb } from 'lucide-react';
import { useWeeklyExerciseInsights, WeeklyExerciseInsight } from '@/hooks/useWeeklyExerciseInsights';

export const WeeklyExerciseInsightsCard = () => {
  const {
    latestInsight,
    isLoading,
    isGenerating,
    generateWeeklyInsight,
    getWeekDateRange,
    getProgressComparison,
    getCurrentWeekStatus
  } = useWeeklyExerciseInsights();

  if (isLoading) {
    return (
      <Card className="border-2 border-green-300 dark:border-green-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Weekly Exercise Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  const { needsAnalysis } = getCurrentWeekStatus();

  if (!latestInsight || needsAnalysis) {
    return (
      <Card className="border-2 border-amber-300 dark:border-amber-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-600" />
            Weekly Exercise Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {needsAnalysis 
              ? "Ready to analyze your latest week of workouts!"
              : "No weekly insights available yet."
            }
          </p>
          <Button 
            onClick={generateWeeklyInsight}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Your Progress...
              </>
            ) : (
              <>
                <Target className="h-4 w-4 mr-2" />
                Generate Weekly Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <WeeklyInsightDisplay insight={latestInsight} />;
};

interface WeeklyInsightDisplayProps {
  insight: WeeklyExerciseInsight;
}

const WeeklyInsightDisplay = ({ insight }: WeeklyInsightDisplayProps) => {
  const { getWeekDateRange, getProgressComparison, generateWeeklyInsight, isGenerating } = useWeeklyExerciseInsights();
  
  const comparison = getProgressComparison(insight);
  const weekRange = getWeekDateRange(insight.week_start_date, insight.week_end_date);

  const getVolumeTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getVolumeTrendColor = (trend: string | null) => {
    switch (trend) {
      case 'increasing':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'decreasing':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  return (
    <Card className="border-2 border-green-300 dark:border-green-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-green-600" />
            Weekly Exercise Insights
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={generateWeeklyInsight}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {weekRange}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Motivational Headline */}
        <div className="text-center">
          <h3 className="text-xl font-bold text-green-600 dark:text-green-400 mb-2">
            {insight.motivational_headline}
          </h3>
        </div>

        {/* Progress Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{insight.workouts_completed}</div>
            <div className="text-sm text-muted-foreground">Workouts Completed</div>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{Math.round(insight.total_duration_minutes)}</div>
            <div className="text-sm text-muted-foreground">Total Minutes</div>
          </div>
        </div>

        {/* Volume Trend */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Volume Trend:</span>
          <Badge className={getVolumeTrendColor(insight.volume_trend)}>
            <div className="flex items-center gap-1">
              {getVolumeTrendIcon(insight.volume_trend)}
              <span className="capitalize">{insight.volume_trend || 'stable'}</span>
            </div>
          </Badge>
        </div>

        {/* Progress Message */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950 dark:to-green-950 p-4 rounded-lg">
          <p className="text-sm font-medium text-foreground">
            {insight.progress_message}
          </p>
        </div>

        {/* Muscle Groups */}
        {insight.most_frequent_muscle_groups.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Most Trained Areas:</h4>
            <div className="flex flex-wrap gap-2">
              {insight.most_frequent_muscle_groups.map((group, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {group}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Missed Areas */}
        {insight.missed_target_areas.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 text-amber-600">Areas to Focus:</h4>
            <div className="flex flex-wrap gap-2">
              {insight.missed_target_areas.map((area, index) => (
                <Badge key={index} variant="outline" className="text-xs text-amber-600 border-amber-300">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Suggestion */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950 dark:to-indigo-950 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-1">
                Next Week's Focus:
              </h4>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                {insight.suggestion_tip}
              </p>
            </div>
          </div>
        </div>

        {/* Comparison with previous week */}
        {comparison && (
          <div className="text-xs text-muted-foreground border-t pt-4">
            <p>
              vs. Previous Week: 
              {comparison.workoutChange !== 0 && (
                <span className={comparison.workoutChange > 0 ? 'text-green-600' : 'text-red-600'}>
                  {comparison.workoutChange > 0 ? ' +' : ' '}{comparison.workoutChange} workouts
                </span>
              )}
              {comparison.durationChange !== 0 && (
                <span className={comparison.durationChange > 0 ? 'text-green-600' : 'text-red-600'}>
                  {comparison.workoutChange !== 0 ? ', ' : ' '}
                  {comparison.durationChange > 0 ? '+' : ''}{Math.round(comparison.durationChange)} minutes
                </span>
              )}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};