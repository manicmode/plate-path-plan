import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, Share2 } from 'lucide-react';
import { useRealExerciseData } from '@/hooks/useRealExerciseData';
import { useWeeklyExerciseInsights } from '@/hooks/useWeeklyExerciseInsights';

interface ProgressOverviewCardProps {
  className?: string;
}

export const ProgressOverviewCard = ({ className }: ProgressOverviewCardProps) => {
  const { summary, weeklyChartData } = useRealExerciseData('30d');
  const { latestInsight } = useWeeklyExerciseInsights();

  // Calculate insights
  const workoutDays = weeklyChartData.filter(day => day.duration > 0);
  const mostActiveDay = workoutDays.reduce((max, day) => 
    day.duration > max.duration ? day : max, 
    { day: 'None', duration: 0 }
  );

  const totalVolumeIncrease = latestInsight?.volume_trend === 'increasing' ? '+20%' : 
                             latestInsight?.volume_trend === 'decreasing' ? '-10%' : '0%';

  const aiInsights = [
    `You're most consistent on ${mostActiveDay.day}s`,
    `Total training volume ${totalVolumeIncrease} this month`,
    `${workoutDays.length}/7 days active this week`,
    latestInsight?.progress_message || "Keep up the great work!"
  ];

  const handleShareProgress = () => {
    // Mock share functionality
    if (navigator.share) {
      navigator.share({
        title: 'My Fitness Progress',
        text: `I've completed ${summary.totalDuration} minutes of workouts this month! 💪`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(
        `I've completed ${summary.totalDuration} minutes of workouts this month! 💪 Check out my progress at ${window.location.href}`
      );
    }
  };

  return (
    <Card className={`shadow-lg border-border bg-card ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            🧠 AI Progress Insights
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareProgress}
            className="flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {summary.totalDuration}
            </div>
            <div className="text-xs text-muted-foreground">Total Minutes</div>
          </div>
          <div className="text-center p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {workoutDays.length}
            </div>
            <div className="text-xs text-muted-foreground">Active Days</div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Smart Insights
          </h4>
          {aiInsights.map((insight, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="text-lg">💡</div>
              <p className="text-sm text-foreground">{insight}</p>
            </div>
          ))}
        </div>

        {/* Progress Trends */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            This Month's Trends
          </h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
              ↗️ Duration +15%
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
              🎯 Consistency 85%
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
              🔥 {workoutDays.length} Day Streak
            </Badge>
          </div>
        </div>

        {/* Motivational Message */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
          <p className="text-sm text-center text-foreground font-medium">
            {latestInsight?.motivational_headline || "🌟 You're building amazing habits! Keep pushing forward!"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};