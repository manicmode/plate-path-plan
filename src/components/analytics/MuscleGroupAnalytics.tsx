import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Target, Activity } from 'lucide-react';
import { useMuscleGroupTrends } from '@/hooks/useMuscleGroupTrends';
import { format } from 'date-fns';

const MUSCLE_GROUP_EMOJIS: Record<string, string> = {
  'legs': '🦵',
  'chest': '❤️',
  'back': '🫀',
  'shoulders': '💪',
  'arms': '💪',
  'core': '🧠',
  'glutes': '🍑'
};

const MUSCLE_GROUP_COLORS: Record<string, string> = {
  'legs': '#ef4444',
  'chest': '#f97316', 
  'back': '#eab308',
  'shoulders': '#22c55e',
  'arms': '#3b82f6',
  'core': '#8b5cf6',
  'glutes': '#ec4899'
};

function MuscleGroupCard({ 
  muscleGroup, 
  trends, 
  summary 
}: { 
  muscleGroup: string;
  trends: any[];
  summary?: any;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const emoji = MUSCLE_GROUP_EMOJIS[muscleGroup.toLowerCase()] || '💪';
  const color = MUSCLE_GROUP_COLORS[muscleGroup.toLowerCase()] || '#6366f1';

  if (!trends.length) return null;

  const latestTrend = trends[0];
  const chartData = trends
    .reverse()
    .map(trend => ({
      week: format(new Date(trend.week_start), 'MMM dd'),
      completed: trend.total_completed_sets,
      skipped: trend.total_skipped_sets,
      completionRate: trend.completion_rate
    }));

  const getBadgeVariant = (badge: string) => {
    switch (badge) {
      case 'excellent': return 'default';
      case 'good': return 'secondary';
      case 'fair': return 'outline';
      default: return 'destructive';
    }
  };

  const getTrendIcon = () => {
    if (latestTrend.trend_direction === 'improving') {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (latestTrend.trend_direction === 'declining') {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Target className="h-4 w-4 text-blue-500" />;
  };

  return (
    <Card className="w-full">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl text-white font-bold"
                  style={{ backgroundColor: color }}
                >
                  {emoji}
                </div>
                <div>
                  <CardTitle className="text-lg capitalize">{muscleGroup}</CardTitle>
                  <div className="flex items-center gap-2 mt-1">
                    {getTrendIcon()}
                    <span className="text-sm text-muted-foreground">
                      {latestTrend.completion_rate}% completion rate
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getBadgeVariant(latestTrend.consistency_badge)} className="capitalize">
                  {latestTrend.consistency_badge.replace('_', ' ')}
                </Badge>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Total Sets</div>
                <div className="text-lg font-semibold">{latestTrend.total_completed_sets}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Sessions</div>
                <div className="text-lg font-semibold">{latestTrend.workout_sessions}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Completion</div>
                <div className="text-lg font-semibold">{latestTrend.completion_rate}%</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="text-sm text-muted-foreground">Weekly Change</div>
                <div className={`text-lg font-semibold ${latestTrend.completion_rate_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {latestTrend.completion_rate_change > 0 ? '+' : ''}{latestTrend.completion_rate_change}%
                </div>
              </div>
            </div>

            {/* Sets Completion Chart */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Sets Completed vs Skipped
              </h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="week" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                    />
                    <Bar dataKey="completed" fill={color} name="Completed Sets" />
                    <Bar dataKey="skipped" fill="#ef4444" name="Skipped Sets" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Completion Rate Trend */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Completion Rate Trend
              </h4>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="week" className="text-xs" />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                      formatter={(value) => [`${value}%`, 'Completion Rate']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completionRate" 
                      stroke={color}
                      strokeWidth={3}
                      dot={{ fill: color, strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Common Exercises */}
            {latestTrend.most_common_exercises?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Most Common Exercises</h4>
                <div className="flex flex-wrap gap-1">
                  {latestTrend.most_common_exercises.slice(0, 3).map((exercise: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {exercise}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function MuscleGroupAnalytics() {
  const { trendData, groupedTrends, loading, error } = useMuscleGroupTrends();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse bg-muted rounded-lg h-32" />
        <div className="animate-pulse bg-muted rounded-lg h-48" />
        <div className="animate-pulse bg-muted rounded-lg h-48" />
      </div>
    );
  }

  if (error || !trendData) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            {error || 'Unable to load muscle group analytics'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const muscleGroups = Object.keys(groupedTrends);

  return (
    <div className="space-y-6">
      {/* AI Insight */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <Activity className="h-5 w-5" />
            AI Muscle Group Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {trendData.aiInsight}
          </p>
          <div className="mt-3 text-xs text-muted-foreground">
            Analysis of {trendData.totalMuscleGroups} muscle groups • Generated {format(new Date(trendData.generatedAt), 'PPp')}
          </div>
        </CardContent>
      </Card>

      {/* Muscle Group Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Muscle Group Performance</h3>
          <Badge variant="secondary">
            {muscleGroups.length} groups analyzed
          </Badge>
        </div>
        
        {muscleGroups.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                No muscle group data available. Complete some workouts to see your trends! 💪
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {muscleGroups.map(muscleGroup => (
              <MuscleGroupCard
                key={muscleGroup}
                muscleGroup={muscleGroup}
                trends={groupedTrends[muscleGroup]}
                summary={trendData.muscleGroupSummary.find(s => s.muscleGroup === muscleGroup)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}