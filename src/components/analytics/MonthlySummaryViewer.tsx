import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import confetti from 'canvas-confetti';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Calendar, Activity, Target, Trophy, Volume2, VolumeX, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthlySummary {
  id: string;
  month_start: string;
  average_score: number | null;
  previous_month_average: number | null;
  meals_logged_count: number | null;
  days_with_meals: number | null;
  message: string;
  ranking_position: number | null;
  created_at: string;
}

export const MonthlySummaryViewer = () => {
  const { user } = useAuth();
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [volume, setVolume] = useState(0.3); // Default to 30% volume

  useEffect(() => {
    const fetchMonthlySummaries = async () => {
      if (!user) return;

      try {
        // Fetch user's monthly summaries
        const { data, error } = await supabase
          .from('monthly_summaries')
          .select('*')
          .eq('user_id', user.id)
          .order('month_start', { ascending: false })
          .limit(6); // Show last 6 months

        if (error) throw error;
        setSummaries(data || []);

        // For each month, get the total user count
        if (data && data.length > 0) {
          const monthCounts: Record<string, number> = {};
          
          for (const summary of data) {
            if (summary.ranking_position) {
              // Only fetch user count if user has a ranking
              const { count, error: countError } = await supabase
                .from('monthly_summaries')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .limit(1);

              if (!countError && count !== null) {
                monthCounts[summary.month_start] = count;
              }
            }
          }
          
          setUserCounts(monthCounts);
        }
      } catch (error) {
        console.error('Error fetching monthly summaries:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthlySummaries();
  }, [user]);

  // Trigger celebration for improved scores
  useEffect(() => {
    summaries.forEach((summary, index) => {
      if (index === 0 && summary.average_score && summary.previous_month_average) {
        if (summary.average_score > summary.previous_month_average) {
          setShowCelebration(summary.id);
          setTimeout(() => setShowCelebration(null), 4000);
        }
      }
    });
  }, [summaries]);

  // Trigger confetti for top 3 rankings (once per session)
  useEffect(() => {
    if (summaries.length === 0 || !user) return;
    
    const latestSummary = summaries[0];
    const ranking = latestSummary.ranking_position;
    
    // Check if user has a top 3 ranking in their latest summary
    if (ranking && ranking <= 3) {
      const confettiKey = `monthly-confetti-${user.id}-${latestSummary.month_start}`;
      const hasShownConfetti = sessionStorage.getItem(confettiKey);
      
      if (!hasShownConfetti) {
        // Set flag first to prevent multiple triggers
        sessionStorage.setItem(confettiKey, 'true');
        
        // Delay confetti slightly to ensure component is fully rendered
        setTimeout(() => {
          triggerRankingConfetti(ranking);
        }, 500);
      }
    }
  }, [summaries, user]);

  // Audio generation for celebration sounds
  const createCelebrationSound = (ranking: number) => {
    if (!audioEnabled) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    gainNode.gain.value = volume;

    const playNote = (frequency: number, duration: number, delay: number = 0) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const noteGain = audioContext.createGain();
        
        oscillator.connect(noteGain);
        noteGain.connect(gainNode);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        // Gentle envelope for smooth sound
        noteGain.gain.setValueAtTime(0, audioContext.currentTime);
        noteGain.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
        noteGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      }, delay);
    };

    // Different melodies for each ranking
    switch (ranking) {
      case 1: // Gold - Triumphant ascending melody
        playNote(523.25, 0.3, 0);    // C5
        playNote(659.25, 0.3, 150);  // E5
        playNote(783.99, 0.3, 300);  // G5
        playNote(1046.50, 0.5, 450); // C6
        break;
      case 2: // Silver - Cheerful celebration
        playNote(440.00, 0.25, 0);   // A4
        playNote(554.37, 0.25, 125); // C#5
        playNote(659.25, 0.4, 250);  // E5
        break;
      case 3: // Bronze - Warm accomplishment
        playNote(349.23, 0.3, 0);    // F4
        playNote(440.00, 0.3, 150);  // A4
        playNote(523.25, 0.4, 300);  // C5
        break;
    }

    console.log(`🔊 Celebration sound played for ranking #${ranking} (volume: ${Math.round(volume * 100)}%)`);
  };

  const triggerRankingConfetti = (ranking: number) => {
    // Play celebration sound first
    createCelebrationSound(ranking);

    const colors = {
      1: ['#FFD700', '#FFA500', '#FFFF00'], // Gold colors
      2: ['#C0C0C0', '#A9A9A9', '#D3D3D3'], // Silver colors  
      3: ['#CD7F32', '#D2691E', '#F4A460']  // Bronze colors
    };

    const particleCount = ranking === 1 ? 150 : ranking === 2 ? 120 : 100;
    const spread = ranking === 1 ? 70 : 60;

    // Multiple bursts for more celebration
    const triggerBurst = (delay: number) => {
      setTimeout(() => {
        confetti({
          particleCount,
          spread,
          origin: { y: 0.6 },
          colors: colors[ranking as keyof typeof colors],
          gravity: 1,
          drift: 0,
          ticks: 300,
          scalar: 1.2,
          shapes: ['star', 'circle'],
          disableForReducedMotion: true,
        });
      }, delay);
    };

    // Create a celebratory sequence
    triggerBurst(0);
    triggerBurst(300);
    if (ranking === 1) {
      triggerBurst(600); // Extra burst for gold medal
    }

    console.log(`🎉 Confetti triggered for ranking #${ranking}!`);
  };

  const getMonthName = (monthStart: string) => {
    const date = new Date(monthStart);
    return format(date, 'MMMM yyyy');
  };

  const getScoreBadgeColor = (score: number | null) => {
    if (!score) return 'bg-gray-500';
    if (score >= 85) return 'bg-emerald-500';
    if (score >= 70) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 45) return 'bg-orange-500';
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

  const getDaysProgress = (daysWithMeals: number | null, monthStart: string) => {
    if (!daysWithMeals) return { percentage: 0, color: 'bg-gray-400' };
    
    const month = new Date(monthStart);
    const isCurrentMonth = month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear();
    const totalDays = isCurrentMonth ? new Date().getDate() : endOfMonth(month).getDate();
    
    const percentage = (daysWithMeals / totalDays) * 100;
    
    let color = 'bg-red-400';
    if (percentage >= 80) color = 'bg-emerald-400';
    else if (percentage >= 60) color = 'bg-green-400';
    else if (percentage >= 40) color = 'bg-yellow-400';
    else if (percentage >= 20) color = 'bg-orange-400';
    
    return { percentage, color };
  };

  const getRankingInfo = (ranking: number | null) => {
    if (!ranking) return null;
    
    switch (ranking) {
      case 1:
        return {
          badge: '🥇',
          tooltip: 'Top 1% – Nutritional Champion!',
          cardClass: 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 shadow-lg shadow-yellow-200/50 dark:shadow-yellow-900/20',
          glow: 'ring-2 ring-yellow-300 ring-offset-2'
        };
      case 2:
        return {
          badge: '🥈',
          tooltip: 'Amazing! You placed second this month!',
          cardClass: 'border-gray-400 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/20 dark:to-gray-600/20 shadow-lg shadow-gray-200/50 dark:shadow-gray-700/20',
          glow: 'ring-2 ring-gray-300 ring-offset-2'
        };
      case 3:
        return {
          badge: '🥉',
          tooltip: 'Great work! Third place overall!',
          cardClass: 'border-amber-600 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-800/20 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/20',
          glow: 'ring-2 ring-amber-400 ring-offset-2'
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Monthly Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
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
            Monthly Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No monthly summaries yet.</p>
            <p className="text-sm">Keep logging meals to unlock monthly insights!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Monthly Progress
            </CardTitle>
            
            {/* Audio Controls */}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setAudioEnabled(!audioEnabled)}
                    className="p-2 rounded-md hover:bg-muted transition-colors"
                    aria-label={audioEnabled ? "Mute celebrations" : "Enable celebrations"}
                  >
                    {audioEnabled ? (
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{audioEnabled ? "Mute celebration sounds" : "Enable celebration sounds"}</p>
                </TooltipContent>
              </Tooltip>
              
              {audioEnabled && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        className="w-16 h-1 bg-muted rounded-lg appearance-none cursor-pointer"
                        aria-label="Volume control"
                      />
                      <span className="text-xs text-muted-foreground min-w-[3ch]">
                        {Math.round(volume * 100)}%
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Adjust celebration volume</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
        {summaries.map((summary, index) => {
          const scoreChange = getScoreChange(summary.average_score, summary.previous_month_average);
          const isLatest = index === 0;
          const daysProgress = getDaysProgress(summary.days_with_meals, summary.month_start);
          const rankingInfo = getRankingInfo(summary.ranking_position);
          
          return (
            <div 
              key={summary.id}
              className={cn(
                "relative p-5 rounded-lg border transition-all duration-300",
                rankingInfo ? rankingInfo.cardClass : (isLatest ? "border-primary bg-primary/5 shadow-md" : "border-border"),
                showCelebration === summary.id && "ring-2 ring-emerald-500 ring-offset-2",
                rankingInfo && rankingInfo.glow
              )}
            >
              {/* Celebration effect for improvements */}
              {showCelebration === summary.id && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/20 via-green-400/20 to-blue-400/20 animate-pulse" />
                  <div className="absolute top-2 right-2 animate-bounce">
                    🎉
                  </div>
                </div>
              )}
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                        {getMonthName(summary.month_start)}
                        {isLatest && <span className="text-xs ml-2 text-primary">(Current)</span>}
                        {rankingInfo && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-2xl cursor-help animate-pulse">
                                {rankingInfo.badge}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">{rankingInfo.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(summary.month_start), 'MMMM yyyy')} Performance
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {summary.ranking_position && !rankingInfo && (
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Trophy className="h-4 w-4" />
                        <span className="text-sm font-medium">#{summary.ranking_position}</span>
                      </div>
                    )}
                    
                    <Badge 
                      className={cn(
                        "text-white font-semibold text-sm px-3 py-1",
                        getScoreBadgeColor(summary.average_score)
                      )}
                    >
                      {summary.average_score?.toFixed(1) || 'N/A'}
                    </Badge>
                    
                    {scoreChange && (
                      <div className={cn(
                        "flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
                        scoreChange.isNeutral 
                          ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          : scoreChange.isPositive 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      )}>
                        {scoreChange.isNeutral ? (
                          <span>~</span>
                        ) : scoreChange.isPositive ? (
                          <>
                            <TrendingUp className="h-4 w-4" />
                            +{scoreChange.value.toFixed(1)}
                          </>
                        ) : (
                          <>
                            <TrendingDown className="h-4 w-4" />
                            -{scoreChange.value.toFixed(1)}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="h-4 w-4" />
                    <span>{summary.meals_logged_count || 0} meals logged</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>{summary.days_with_meals || 0} active days</span>
                  </div>
                </div>
                
                {/* Days progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Activity consistency</span>
                    <span>{daysProgress.percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={cn("h-2 rounded-full transition-all duration-300", daysProgress.color)}
                      style={{ width: `${Math.min(daysProgress.percentage, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-md">
                  <p className="text-sm text-foreground leading-relaxed">
                    {summary.message}
                  </p>
                  
                  {/* Ranking display line */}
                  {summary.ranking_position && userCounts[summary.month_start] && (
                    <div className="mt-3 pt-3 border-t border-muted-foreground/20">
                      <p className="text-xs text-muted-foreground font-medium">
                        You ranked #{summary.ranking_position} this month out of {userCounts[summary.month_start]} users.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};