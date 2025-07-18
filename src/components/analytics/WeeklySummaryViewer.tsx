import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Calendar, Activity, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeeklySummary {
  id: string;
  week_start: string;
  average_score: number | null;
  previous_week_average: number | null;
  meals_logged_count: number | null;
  days_with_meals: number | null;
  message: string;
  created_at: string;
}

export const WeeklySummaryViewer = () => {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeeklySummaries = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('weekly_summaries')
          .select('*')
          .eq('user_id', user.id)
          .order('week_start', { ascending: false })
          .limit(8); // Show last 8 weeks

        if (error) throw error;
        setSummaries(data || []);
      } catch (error) {
        console.error('Error fetching weekly summaries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklySummaries();
  }, [user]);

  // Trigger confetti for improved scores
  useEffect(() => {
    summaries.forEach((summary, index) => {
      if (index === 0 && summary.average_score && summary.previous_week_average) {
        if (summary.average_score > summary.previous_week_average) {
          setShowConfetti(summary.id);
          setTimeout(() => setShowConfetti(null), 3000);
        }
      }
    });
  }, [summaries]);

  const getWeekRange = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = addDays(start, 6);
    return `${format(start, 'MMM d')}–${format(end, 'd')}`;
  };

  const getScoreBadgeColor = (score: number | null) => {
    if (!score) return 'bg-gray-500';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreChange = (current: number | null, previous: number | null) => {
    if (!current || !previous) return null;
    const change = current - previous;
    return {
      value: Math.abs(change),
      isPositive: change > 0,
      isNeutral: Math.abs(change) < 1
    };
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (summaries.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No weekly summaries yet.</p>
            <p className="text-sm">Start logging meals to see your weekly progress!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Weekly Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summaries.map((summary, index) => {
          const scoreChange = getScoreChange(summary.average_score, summary.previous_week_average);
          const isLatest = index === 0;
          
          return (
            <div 
              key={summary.id}
              className={cn(
                "relative p-4 rounded-lg border transition-all duration-300",
                isLatest ? "border-primary bg-primary/5" : "border-border",
                showConfetti === summary.id && "animate-pulse"
              )}
            >
              {/* Confetti effect for improvements */}
              {showConfetti === summary.id && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-green-400/20 to-blue-400/20 animate-pulse" />
                </div>
              )}
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {getWeekRange(summary.week_start)}
                        {isLatest && <span className="text-xs ml-2 text-primary">(Latest)</span>}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Week of {format(new Date(summary.week_start), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      className={cn(
                        "text-white font-semibold",
                        getScoreBadgeColor(summary.average_score)
                      )}
                    >
                      {summary.average_score?.toFixed(1) || 'N/A'}
                    </Badge>
                    
                    {scoreChange && (
                      <div className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                        scoreChange.isNeutral 
                          ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          : scoreChange.isPositive 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}>
                        {scoreChange.isNeutral ? (
                          <span>~</span>
                        ) : scoreChange.isPositive ? (
                          <>
                            <TrendingUp className="h-3 w-3" />
                            +{scoreChange.value.toFixed(1)}
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-3 w-3" />
                            -{scoreChange.value.toFixed(1)}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mb-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    <span>{summary.meals_logged_count || 0} meals</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    <span>{summary.days_with_meals || 0}/7 days</span>
                  </div>
                </div>
                
                <p className="text-sm text-foreground bg-muted/50 p-3 rounded-md">
                  {summary.message}
                </p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};