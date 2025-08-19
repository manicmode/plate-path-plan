import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar,
  Clock,
  Target,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Star,
  Activity
} from "lucide-react";
import { useHabitReport, useHabitKPIs, HabitReportData } from "@/hooks/useHabitReports";
import { formatDistanceToNow } from "date-fns";

interface HabitReportSectionProps {
  period: 'week' | 'month';
}

export function HabitReportSection({ period }: HabitReportSectionProps) {
  const { data: kpis, isLoading: kpisLoading } = useHabitKPIs(period);
  const { data: habits, isLoading: habitsLoading } = useHabitReport(period);

  const isLoading = kpisLoading || habitsLoading;

  const getTopWins = (habits: HabitReportData[]) => {
    return habits.filter(habit => habit.adherence_pct >= 80);
  };

  const getNeedsAttention = (habits: HabitReportData[]) => {
    return habits.filter(habit => {
      const lowAdherence = habit.adherence_pct < 50;
      const staleLogging = habit.last_logged_at ? 
        Date.now() - new Date(habit.last_logged_at).getTime() > (3 * 24 * 60 * 60 * 1000) : true;
      return lowAdherence || staleLogging;
    });
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':');
    const time = new Date();
    time.setHours(parseInt(hours), parseInt(minutes));
    return time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {period === 'week' ? 'Weekly' : 'Monthly'} Habit Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
          <div className="h-32 bg-muted/50 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!kpis || !habits) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {period === 'week' ? 'Weekly' : 'Monthly'} Habit Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No habit data yet</p>
            <p>Start tracking habits to see your {period} insights here!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topWins = getTopWins(habits);
  const needsAttention = getNeedsAttention(habits);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          {period === 'week' ? 'Weekly' : 'Monthly'} Habit Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {kpis.overall_adherence_pct}%
              </div>
              <div className="text-sm text-muted-foreground">Overall Adherence</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{kpis.active_habits}</div>
              <div className="text-sm text-muted-foreground">Active Habits</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{kpis.total_completions}</div>
              <div className="text-sm text-muted-foreground">Total Completions</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{Math.round(kpis.total_minutes)}</div>
              <div className="text-sm text-muted-foreground">Total Minutes</div>
            </CardContent>
          </Card>
        </div>

        {/* Streak Leader */}
        {kpis.streak_leader_slug && kpis.streak_leader_days > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-800">
                <Star className="h-5 w-5" />
                <span className="font-medium">Streak Leader: </span>
                <Badge variant="secondary" className="bg-yellow-200 text-yellow-800">
                  {kpis.streak_leader_slug} - {kpis.streak_leader_days} days
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Wins */}
        {topWins.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
              Top Wins 🎉
            </h3>
            <div className="flex flex-wrap gap-2">
              {topWins.map((habit) => (
                <Badge key={habit.user_habit_id} variant="secondary" className="bg-emerald-100 text-emerald-800">
                  {habit.name} ({habit.adherence_pct}%)
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Needs Attention */}
        {needsAttention.length > 0 && (
          <div>
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-orange-700">
              <AlertCircle className="h-5 w-5" />
              Needs Attention
            </h3>
            <div className="space-y-2">
              {needsAttention.slice(0, 3).map((habit) => (
                <Card key={habit.user_habit_id} className="border-orange-200">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{habit.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {habit.adherence_pct}% adherence
                          {habit.last_logged_at && (
                            <span className="ml-2">
                              • Last: {formatDistanceToNow(new Date(habit.last_logged_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            // Navigate to habit central with focus on this habit
                            window.location.href = `/habit#${habit.slug}`;
                          }}
                        >
                          Log Now
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            // Could implement snooze functionality
                            window.location.href = `/habit#${habit.slug}`;
                          }}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Habits Table */}
        <div>
          <h3 className="font-semibold text-lg mb-3">All Habits</h3>
          <div className="space-y-3">
            {habits.map((habit) => (
              <Card key={habit.user_habit_id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div>
                          <h4 className="font-medium">{habit.name}</h4>
                          <p className="text-sm text-muted-foreground">{habit.domain}</p>
                        </div>
                        <Badge variant={habit.adherence_pct >= 80 ? "default" : habit.adherence_pct >= 50 ? "secondary" : "destructive"}>
                          {habit.adherence_pct}%
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span>{habit.completions}/{habit.expected_count}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{Math.round(habit.minutes)}min</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span>{habit.current_streak} day streak</span>
                        </div>
                        
                        {habit.last_logged_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{formatDistanceToNow(new Date(habit.last_logged_at), { addSuffix: true })}</span>
                          </div>
                        )}
                      </div>
                      
                      <Progress 
                        value={habit.adherence_pct} 
                        className="mt-2 h-2"
                      />
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          window.location.href = `/habit#${habit.slug}`;
                        }}
                      >
                        Log
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          window.location.href = `/habit#${habit.slug}`;
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}