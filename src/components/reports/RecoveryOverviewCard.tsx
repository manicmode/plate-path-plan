import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, subWeeks, subMonths, subYears, isWithinInterval } from "date-fns";
import { Heart, Brain, Wind, Moon, TrendingUp, Award, Calendar, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth";

interface RecoveryOverviewProps {
  reportType: 'weekly' | 'monthly' | 'yearly';
  reportDate?: Date;
}

interface RecoverySessionLog {
  id: string;
  category: string;
  duration_minutes: number;
  completed_at: string;
  session_id: string;
  mood_before?: number;
  mood_after?: number;
}

interface MeditationStreakData {
  current_streak: number;
  total_sessions: number;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_sessions: number;
}

interface MoodTrend {
  before: number;
  after: number;
  improvement: number;
}

export function RecoveryOverviewCard({ reportType, reportDate }: RecoveryOverviewProps) {
  const { user } = useAuth();
  const [selectedView, setSelectedView] = useState<'summary' | 'details'>('summary');

  // Calculate date range based on report type
  const getDateRange = () => {
    const endDate = reportDate || new Date();
    let startDate: Date;

    switch (reportType) {
      case 'weekly':
        startDate = subWeeks(endDate, 1);
        break;
      case 'monthly':
        startDate = subMonths(endDate, 1);
        break;
      case 'yearly':
        startDate = subYears(endDate, 1);
        break;
      default:
        startDate = subWeeks(endDate, 1);
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch recovery session logs
  const { data: sessionLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['recovery-session-logs', reportType, startDate, endDate],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('recovery_session_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return data as RecoverySessionLog[];
    },
    enabled: !!user,
  });

  // Fetch streak data for each category
  const { data: meditationStreak, isLoading: meditationLoading } = useQuery({
    queryKey: ['meditation-streak', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('meditation_streaks')
        .select('current_streak, total_sessions')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as MeditationStreakData | null;
    },
    enabled: !!user,
  });

  const { data: breathingStreak, isLoading: breathingLoading } = useQuery({
    queryKey: ['breathing-streak', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('breathing_streaks')
        .select('current_streak, longest_streak, total_sessions')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as StreakData | null;
    },
    enabled: !!user,
  });

  const { data: sleepStreak, isLoading: sleepLoading } = useQuery({
    queryKey: ['sleep-streak', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('sleep_streaks')
        .select('current_streak, longest_streak, total_sessions')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data as StreakData | null;
    },
    enabled: !!user,
  });

  // Calculate recovery metrics
  const recoveryMetrics = {
    totalSessions: sessionLogs.length,
    totalMinutes: sessionLogs.reduce((sum, log) => sum + log.duration_minutes, 0),
    meditationSessions: sessionLogs.filter(log => log.category === 'meditation').length,
    breathingSessions: sessionLogs.filter(log => log.category === 'breathing').length,
    yogaSessions: sessionLogs.filter(log => log.category === 'yoga').length,
    sleepSessions: sessionLogs.filter(log => log.category === 'sleep').length,
    stretchingSessions: sessionLogs.filter(log => log.category === 'stretching').length,
    muscleRecoverySessions: sessionLogs.filter(log => log.category === 'muscle-recovery').length,
  };

  // Calculate mood trends
  const moodTrend: MoodTrend | null = (() => {
    const sessionsWithMood = sessionLogs.filter(log => 
      log.mood_before !== null && log.mood_after !== null && 
      log.mood_before !== undefined && log.mood_after !== undefined
    );

    if (sessionsWithMood.length === 0) return null;

    const avgBefore = sessionsWithMood.reduce((sum, log) => sum + (log.mood_before || 0), 0) / sessionsWithMood.length;
    const avgAfter = sessionsWithMood.reduce((sum, log) => sum + (log.mood_after || 0), 0) / sessionsWithMood.length;
    
    return {
      before: avgBefore,
      after: avgAfter,
      improvement: avgAfter - avgBefore,
    };
  })();

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getRecoveryScore = () => {
    if (recoveryMetrics.totalSessions === 0) return 0;
    
    const consistencyScore = Math.min(recoveryMetrics.totalSessions * 10, 50);
    const durationScore = Math.min(recoveryMetrics.totalMinutes / 10, 30);
    const varietyScore = Math.min(
      [recoveryMetrics.meditationSessions, recoveryMetrics.breathingSessions, 
       recoveryMetrics.yogaSessions, recoveryMetrics.sleepSessions].filter(count => count > 0).length * 5, 
      20
    );
    
    return Math.round(consistencyScore + durationScore + varietyScore);
  };

  const recoveryScore = getRecoveryScore();

  const getMotivationColor = (score: number) => {
    if (score >= 80) return "bg-gradient-to-r from-purple-500 to-pink-500";
    if (score >= 60) return "bg-gradient-to-r from-green-500 to-emerald-500";
    if (score >= 40) return "bg-gradient-to-r from-blue-500 to-cyan-500";
    return "bg-gradient-to-r from-orange-500 to-red-500";
  };

  // Don't render if no recovery data exists
  if (logsLoading || meditationLoading || breathingLoading || sleepLoading) {
    return (
      <Card className="animate-pulse w-full shadow-lg bg-card dark:!border-2 dark:!border-purple-500/60 dark:bg-gradient-to-r dark:from-purple-500/30 dark:to-pink-500/30">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (recoveryMetrics.totalSessions === 0 && !meditationStreak && !breathingStreak && !sleepStreak) {
    return null; // Hide card if no recovery data
  }

  return (
    <>
      <Card className="w-full shadow-lg bg-card dark:!border-2 dark:!border-purple-500/60 dark:bg-gradient-to-r dark:from-purple-500/30 dark:to-pink-500/30 relative overflow-hidden">
        <div className={`absolute inset-0 opacity-10 ${getMotivationColor(recoveryScore)}`} />
        
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-purple-500" />
            🧘‍♂️ Recovery Overview
          </CardTitle>
          <CardDescription>
            Your {reportType} recovery and wellness summary
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Recovery Score */}
            <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{recoveryScore}</span>
                <span className="text-sm text-muted-foreground">📈 Recovery Score</span>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-2xl font-bold">{recoveryMetrics.totalSessions}</span>
                </div>
                <div className="text-xs text-muted-foreground">Total Sessions</div>
              </div>

              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-2xl font-bold">{formatDuration(recoveryMetrics.totalMinutes)}</span>
                </div>
                <div className="text-xs text-muted-foreground">Time Spent</div>
              </div>

              {meditationStreak && (
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Brain className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold">{meditationStreak.current_streak}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">🧘‍♂️ Streak</div>
                </div>
              )}

              {moodTrend && (
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-2xl font-bold">+{moodTrend.improvement.toFixed(1)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">😊 Mood Boost</div>
                </div>
              )}
            </div>

            {/* Activity Breakdown */}
            <div className="flex flex-wrap gap-2">
              {recoveryMetrics.meditationSessions > 0 && (
                <Badge variant="secondary" className="text-xs">
                  🧘‍♂️ {recoveryMetrics.meditationSessions} meditation
                </Badge>
              )}
              {recoveryMetrics.breathingSessions > 0 && (
                <Badge variant="secondary" className="text-xs">
                  🌬️ {recoveryMetrics.breathingSessions} breathing
                </Badge>
              )}
              {recoveryMetrics.yogaSessions > 0 && (
                <Badge variant="secondary" className="text-xs">
                  🧎‍♀️ {recoveryMetrics.yogaSessions} yoga
                </Badge>
              )}
              {recoveryMetrics.sleepSessions > 0 && (
                <Badge variant="secondary" className="text-xs">
                  😴 {recoveryMetrics.sleepSessions} sleep prep
                </Badge>
              )}
              {recoveryMetrics.stretchingSessions > 0 && (
                <Badge variant="secondary" className="text-xs">
                  🧘‍♂️ {recoveryMetrics.stretchingSessions} stretching
                </Badge>
              )}
              {recoveryMetrics.muscleRecoverySessions > 0 && (
                <Badge variant="secondary" className="text-xs">
                  🧪 {recoveryMetrics.muscleRecoverySessions} muscle recovery
                </Badge>
              )}
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Award className="h-4 w-4 mr-2" />
                  View Detailed Recovery Report
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <Heart className="h-5 w-5 text-purple-500" />
                    🧘‍♂️ Detailed Recovery Analysis
                  </DialogTitle>
                  <DialogDescription>
                    Complete recovery summary for {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Streaks Overview */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Current Streaks & Achievements
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {meditationStreak && (
                        <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg">
                          <Brain className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                          <div className="text-xl font-bold">{meditationStreak.current_streak}</div>
                          <div className="text-sm text-muted-foreground">🧘‍♂️ Meditation Streak</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Total: {meditationStreak.total_sessions} sessions
                          </div>
                        </div>
                      )}
                      
                      {breathingStreak && (
                        <div className="text-center p-4 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-950/20 dark:to-teal-950/20 rounded-lg">
                          <Wind className="h-6 w-6 mx-auto mb-2 text-cyan-500" />
                          <div className="text-xl font-bold">{breathingStreak.current_streak}</div>
                          <div className="text-sm text-muted-foreground">🌬️ Breathing Streak</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Longest: {breathingStreak.longest_streak} | Total: {breathingStreak.total_sessions}
                          </div>
                        </div>
                      )}
                      
                      {sleepStreak && (
                        <div className="text-center p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-lg">
                          <Moon className="h-6 w-6 mx-auto mb-2 text-indigo-500" />
                          <div className="text-xl font-bold">{sleepStreak.current_streak}</div>
                          <div className="text-sm text-muted-foreground">😴 Sleep Prep Streak</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Longest: {sleepStreak.longest_streak} | Total: {sleepStreak.total_sessions}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Mood Analysis */}
                  {moodTrend && (
                    <div>
                      <h3 className="font-semibold mb-3">😊 Mood Impact Analysis</h3>
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 rounded-lg">
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                              {moodTrend.before.toFixed(1)}
                            </div>
                            <div className="text-sm text-muted-foreground">Before Sessions</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              +{moodTrend.improvement.toFixed(1)}
                            </div>
                            <div className="text-sm text-muted-foreground">Improvement</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                              {moodTrend.after.toFixed(1)}
                            </div>
                            <div className="text-sm text-muted-foreground">After Sessions</div>
                          </div>
                        </div>
                        <p className="text-center text-sm text-muted-foreground mt-3">
                          Recovery sessions consistently improve your mood by {moodTrend.improvement.toFixed(1)} points on average! 📈
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recovery Score Breakdown */}
                  <div>
                    <h3 className="font-semibold mb-3">📈 Recovery Score Breakdown</h3>
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="text-center mb-4">
                        <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">{recoveryScore}/100</div>
                        <div className="text-sm text-muted-foreground">Overall Recovery Score</div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Consistency (Sessions)</span>
                          <span>{Math.min(recoveryMetrics.totalSessions * 10, 50)}/50</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Duration (Total Time)</span>
                          <span>{Math.min(Math.round(recoveryMetrics.totalMinutes / 10), 30)}/30</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Variety (Different Types)</span>
                          <span>{Math.min(
                            [recoveryMetrics.meditationSessions, recoveryMetrics.breathingSessions, 
                             recoveryMetrics.yogaSessions, recoveryMetrics.sleepSessions].filter(count => count > 0).length * 5, 
                            20
                          )}/20</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </>
  );
}