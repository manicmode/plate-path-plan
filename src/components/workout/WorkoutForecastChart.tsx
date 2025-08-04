import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Target, Activity } from 'lucide-react';
import { useWorkoutForecast, WorkoutForecast, WorkoutTrends } from '@/hooks/useWorkoutForecast';

interface WorkoutForecastChartProps {
  className?: string;
}

export function WorkoutForecastChart({ className }: WorkoutForecastChartProps) {
  const { forecastData, loading, error } = useWorkoutForecast();

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Workout Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !forecastData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Workout Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            {error || 'No forecast data available'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const { trends, forecast, summary } = forecastData;

  // Prepare chart data - combine past trends with future predictions
  const chartData = [
    // Historical data points (simulated based on trends)
    { week: -3, type: 'historical', workouts: Math.max(1, trends.avg_weekly_workouts - 1), completion: Math.max(50, trends.overall_completion_rate - 10) },
    { week: -2, type: 'historical', workouts: Math.max(1, trends.avg_weekly_workouts - 0.5), completion: Math.max(50, trends.overall_completion_rate - 5) },
    { week: -1, type: 'historical', workouts: trends.avg_weekly_workouts, completion: trends.overall_completion_rate },
    { week: 0, type: 'current', workouts: trends.avg_weekly_workouts, completion: trends.overall_completion_rate },
    // Forecast data
    ...forecast.map(week => ({
      week: week.forecast_week,
      type: 'forecast',
      workouts: week.predicted_workouts,
      completion: week.predicted_completion_rate,
      confidence: week.confidence_score
    }))
  ];

  const getTrendIcon = () => {
    switch (trends.trend_direction) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Target className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trends.trend_direction) {
      case 'improving':
        return 'text-green-600 dark:text-green-400';
      case 'declining':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const getConfidenceBadgeVariant = () => {
    switch (summary.confidence) {
      case 'high':
        return 'default';
      case 'low':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Workout Forecast
          </div>
          <Badge variant={getConfidenceBadgeVariant()}>
            {summary.confidence} confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AI Forecast Summary Card */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <div className="text-2xl">{summary.emoji}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {getTrendIcon()}
                <span className={`font-medium ${getTrendColor()}`}>
                  AI Forecast
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                {summary.text}
              </p>
              {summary.highlights.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {summary.highlights.slice(0, 3).map((highlight, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {highlight}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Workout Frequency Chart */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Weekly Workouts Projection
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="week" 
                  tickFormatter={(value) => value === 0 ? 'Now' : value > 0 ? `+${value}w` : `${value}w`}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <ReferenceLine x={0} stroke="hsl(var(--border))" strokeDasharray="2 2" />
                <Area
                  type="monotone"
                  dataKey="workouts"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="workouts"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Completion Rate Chart */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Completion Rate Trend
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="week" 
                  tickFormatter={(value) => value === 0 ? 'Now' : value > 0 ? `+${value}w` : `${value}w`}
                  className="text-xs"
                />
                <YAxis domain={[0, 100]} className="text-xs" />
                <ReferenceLine x={0} stroke="hsl(var(--border))" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="completion"
                  stroke="hsl(var(--accent-foreground))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--accent-foreground))', strokeWidth: 2, r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Metrics Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm text-muted-foreground">Current Avg</div>
            <div className="text-lg font-semibold">
              {trends.avg_weekly_workouts.toFixed(1)} workouts/week
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="text-sm text-muted-foreground">Projected Avg</div>
            <div className="text-lg font-semibold">
              {(forecast.reduce((sum, week) => sum + week.predicted_workouts, 0) / 4).toFixed(1)} workouts/week
            </div>
          </div>
        </div>

        {/* Consistency Rating */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <span className="text-sm text-muted-foreground">Consistency Rating</span>
          <Badge 
            variant={trends.consistency_rating === 'excellent' ? 'default' : 
                    trends.consistency_rating === 'good' ? 'secondary' : 'outline'}
            className="capitalize"
          >
            {trends.consistency_rating}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}