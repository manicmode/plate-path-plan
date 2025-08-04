import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Sparkles } from 'lucide-react';
import { useWorkoutForecast } from '@/hooks/useWorkoutForecast';

interface WorkoutForecastCardProps {
  className?: string;
  compact?: boolean;
}

export function WorkoutForecastCard({ className, compact = false }: WorkoutForecastCardProps) {
  const { forecastData, loading, error } = useWorkoutForecast();

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <Sparkles className="h-4 w-4 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Analyzing trends...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !forecastData) {
    return null;
  }

  const { summary, trends, forecast } = forecastData;
  
  const getTrendIcon = () => {
    switch (trends.trend_direction) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const avgForecastWorkouts = forecast.reduce((sum, week) => sum + week.predicted_workouts, 0) / 4;
  const workoutChange = ((avgForecastWorkouts - trends.avg_weekly_workouts) / trends.avg_weekly_workouts) * 100;

  return (
    <Card className={`bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800 ${className}`}>
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-xl">{summary.emoji}</div>
              <span className="font-medium text-sm">AI Forecast</span>
            </div>
            <Badge 
              variant={summary.confidence === 'high' ? 'default' : 
                      summary.confidence === 'low' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {summary.confidence}
            </Badge>
          </div>

          {/* Main forecast text */}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {summary.text}
          </p>

          {/* Key metrics */}
          <div className="flex items-center justify-between pt-2 border-t border-blue-200/50 dark:border-blue-800/50">
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              <span className="text-xs text-muted-foreground">
                {Math.abs(workoutChange).toFixed(0)}% {workoutChange >= 0 ? 'increase' : 'decrease'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {avgForecastWorkouts.toFixed(1)} workouts/week
            </div>
          </div>

          {/* Highlights (compact mode) */}
          {!compact && summary.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-2">
              {summary.highlights.slice(0, 2).map((highlight, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {highlight}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}