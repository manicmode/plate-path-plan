import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Target, Activity, Zap, Dumbbell } from 'lucide-react';
import { useMuscleGroupTrends } from '@/hooks/useMuscleGroupTrends';
import { format } from 'date-fns';

const MUSCLE_GROUP_EMOJIS: Record<string, string> = {
  'legs': '🦵',
  'chest': '💥',
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

function CompactMuscleGroupCard({ 
  muscleGroup, 
  trends,
  aiInsight
}: { 
  muscleGroup: string;
  trends: any[];
  aiInsight?: string;
}) {
  const emoji = MUSCLE_GROUP_EMOJIS[muscleGroup.toLowerCase()] || '💪';
  const color = MUSCLE_GROUP_COLORS[muscleGroup.toLowerCase()] || '#6366f1';

  if (!trends.length) return null;

  const latestTrend = trends[0];
  const sparklineData = trends
    .reverse()
    .slice(-4) // Last 4 weeks only for compact view
    .map(trend => ({
      week: format(new Date(trend.week_start), 'M/d'),
      completionRate: trend.completion_rate,
      sets: trend.total_completed_sets
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
      return <TrendingUp className="h-3 w-3 text-green-500" />;
    } else if (latestTrend.trend_direction === 'declining') {
      return <TrendingDown className="h-3 w-3 text-red-500" />;
    }
    return <Target className="h-3 w-3 text-blue-500" />;
  };

  const topExercises = latestTrend.most_common_exercises?.slice(0, 3) || [];

  return (
    <div className="bg-card rounded-lg border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {emoji}
          </div>
          <div>
            <h4 className="font-semibold text-sm capitalize">{muscleGroup}</h4>
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className="text-xs text-muted-foreground">
                {latestTrend.completion_rate}%
              </span>
            </div>
          </div>
        </div>
        <Badge variant={getBadgeVariant(latestTrend.consistency_badge)} className="text-xs capitalize">
          {latestTrend.consistency_badge.replace('_', ' ')}
        </Badge>
      </div>

      {/* Sparkline Chart */}
      <div className="h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparklineData}>
            <Area
              type="monotone"
              dataKey="completionRate"
              stroke={color}
              fill={color}
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '6px',
                fontSize: '11px'
              }}
              formatter={(value) => [`${value}%`, 'Completion']}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-muted-foreground">Completed:</span>
            <span className="ml-1 font-semibold text-green-600">
              {Math.round((latestTrend.completion_rate / 100) * latestTrend.total_planned_sets)}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Skipped:</span>
            <span className="ml-1 font-semibold text-red-600">
              {latestTrend.total_skipped_sets}
            </span>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {latestTrend.completion_rate_change > 0 ? '+' : ''}{latestTrend.completion_rate_change}%
        </div>
      </div>

      {/* Top Exercises */}
      {topExercises.length > 0 && (
        <div className="pt-2 border-t border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Top Exercises:</div>
          <div className="flex flex-wrap gap-1">
            {topExercises.map((exercise: string, index: number) => (
              <div key={index} className="flex items-center gap-1 bg-muted/50 rounded px-2 py-1">
                <Dumbbell className="h-3 w-3" />
                <span className="text-xs font-medium">{exercise}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MuscleGroupTrendsSection() {
  const { trendData, groupedTrends, loading, error } = useMuscleGroupTrends();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Muscle Group Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !trendData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Muscle Group Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-4">
            Complete some workouts to see muscle group trends! 💪
          </p>
        </CardContent>
      </Card>
    );
  }

  const muscleGroups = Object.keys(groupedTrends);

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                <CardTitle>🎯 Muscle Group Trends</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {muscleGroups.length} groups
                </Badge>
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* AI Insight */}
            {trendData.aiInsight && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold">
                    🧠
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">AI Insight</div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {trendData.aiInsight}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Muscle Group Grid */}
            {muscleGroups.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">💪</div>
                <p className="text-muted-foreground">
                  No muscle group data yet. Start tracking your workouts!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {muscleGroups.map(muscleGroup => (
                  <CompactMuscleGroupCard
                    key={muscleGroup}
                    muscleGroup={muscleGroup}
                    trends={groupedTrends[muscleGroup]}
                    aiInsight={trendData.aiInsight}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}