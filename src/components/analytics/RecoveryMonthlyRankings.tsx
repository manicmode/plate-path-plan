import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trophy, Users, Clock, ExternalLink, Flame, TrendingUp, TrendingDown } from 'lucide-react';
import { useRecoveryLeaderboard, RecoveryLeaderboardUser } from '@/hooks/useRecoveryLeaderboard';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/useSound';
import { useAuth } from '@/contexts/auth';
import { cn } from '@/lib/utils';

export const RecoveryMonthlyRankings: React.FC = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<RecoveryLeaderboardUser | null>(null);
  
  const { leaderboard, loading, refresh } = useRecoveryLeaderboard();
  const { toast } = useToast();
  const { playChallengeWin } = useSound();
  const { user } = useAuth();

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
    refresh();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getRecoveryTypeEmoji = (type: string) => {
    const emojis = {
      'meditation': '🧘‍♀️',
      'breathing': '🌬️',
      'yoga': '🧎‍♀️',
      'sleep': '😴',
      'stretching': '🤸',
      'muscle-recovery': '🧪',
      'thermotherapy': '🔥'
    };
    return emojis[type as keyof typeof emojis] || '🧘‍♂️';
  };

  const getStreakBonus = (user: RecoveryLeaderboardUser) => {
    const bonus = 1.0 + Math.min(user.currentStreak * 0.1, 1.0);
    return `x${bonus.toFixed(1)}`;
  };

  const getFunTitle = (user: RecoveryLeaderboardUser) => {
    if (user.rank === 1) return "🧘 Zen Master";
    if (user.rank === 2) return "🌟 Recovery Star";
    if (user.rank === 3) return "🏅 Wellness Warrior";
    if (user.currentStreak >= 20) return "🔥 Streak Legend";
    if (user.currentStreak >= 10) return "💪 Consistency King";
    if (user.dominantRecoveryType === 'meditation') return "🧘‍♂️ Mindful One";
    if (user.dominantRecoveryType === 'breathing') return "🌬️ Breath Master";
    if (user.dominantRecoveryType === 'yoga') return "🧘‍♀️ Yoga Guru";
    if (user.dominantRecoveryType === 'sleep') return "😴 Sleep Champion";
    return "🌿 Recovery Rookie";
  };

  const renderUserCard = (user: RecoveryLeaderboardUser, index: number) => (
    <Card 
      key={user.id}
      className={cn(
        "cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border rounded-lg relative overflow-hidden",
        user.isCurrentUser 
          ? 'ring-2 ring-teal-400/50 bg-gradient-to-r from-teal-50/80 to-purple-50/80 border-teal-300 dark:from-teal-900/30 dark:to-purple-900/30 dark:border-teal-600 shadow-lg shadow-teal-200/50 dark:shadow-teal-900/20' 
          : 'border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600',
        index < 3 && 'animate-pulse'
      )}
      onClick={() => setSelectedUser(user)}
    >
      {/* Top 3 rank glow effect */}
      {index < 3 && (
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-transparent to-yellow-400/10 animate-pulse" />
      )}
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Rank Badge */}
            <div className={cn(
              "flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm flex-shrink-0",
              index === 0 ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white animate-bounce" :
              index === 1 ? "bg-gradient-to-r from-gray-300 to-gray-500 text-white animate-bounce" :
              index === 2 ? "bg-gradient-to-r from-amber-500 to-amber-700 text-white animate-bounce" :
              "bg-muted text-muted-foreground"
            )}>
              {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${user.rank}`}
            </div>
            
            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-lg">{user.avatar}</div>
                <div className="font-semibold text-sm truncate">{user.nickname}</div>
                {user.isCurrentUser && (
                  <Badge variant="secondary" className="text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">YOU</Badge>
                )}
              </div>
              
              {/* Fun Title */}
              <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-2">
                {getFunTitle(user)}
              </div>
              
              {/* Total Recovery Score */}
              <div className="flex items-center gap-2 text-sm font-bold text-teal-700 dark:text-teal-300 mb-2">
                <Trophy className="h-4 w-4" />
                <span>Score: {user.score}</span>
                <span className="text-xs text-muted-foreground">({getStreakBonus(user)} bonus)</span>
              </div>
              
              {/* Recovery Types Breakdown */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                <span>🧘‍♀️ {user.meditationStreak}</span>
                <span>🌬️ {user.breathingStreak}</span>
                <span>🧎‍♀️ {user.yogaStreak}</span>
                <span>😴 {user.sleepStreak}</span>
                <span>🤸 {(user as any).stretchingStreak || 0}</span>
                <span>🧪 {user.thermotherapyStreak}</span>
              </div>
              
              {/* Total Sessions */}
              <div className="text-xs text-muted-foreground">
                Total Sessions: {user.totalSessions}
              </div>
            </div>
          </div>
          
          {/* Right Side Stats */}
          <div className="flex flex-col items-end gap-1">
            {/* Current Streak */}
            <div className="flex items-center gap-1 text-sm">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-bold">{user.currentStreak}d</span>
            </div>
            
            {/* Weekly Progress */}
            <div className="text-xs text-muted-foreground">
              {user.weeklyProgress}% this week
            </div>
            
            {/* Improvement */}
            <div className="flex items-center gap-1">
              {user.improvement > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+{user.improvement}</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 text-red-600" />
                  <span className="text-xs text-red-600">{user.improvement}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pt-8 mb-12 flex flex-col items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="text-2xl animate-bounce hover:scale-110 transition-transform duration-300">🧘‍♂️</div>
          <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-teal-400 via-purple-500 to-teal-600 bg-clip-text text-transparent">
            RECOVERY RANKINGS
          </h1>
          <div className="text-2xl animate-bounce hover:scale-110 transition-transform duration-300">🧘‍♂️</div>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMonthChange('prev')}
            className="h-10 w-10 p-0 rounded-xl border-2 border-teal-400/50 hover:border-teal-400 hover:bg-teal-400/10 transition-all duration-200"
          >
            ←
          </Button>
          <div className="flex items-center gap-3 text-sm font-semibold px-6 py-3 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-teal-400 border border-teal-400/30">
            <Calendar className="h-4 w-4" />
            🧘 {formatMonthYear(currentMonth)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMonthChange('next')}
            disabled={currentMonth >= new Date()}
            className="h-10 w-10 p-0 rounded-xl border-2 border-teal-400/50 hover:border-teal-400 hover:bg-teal-400/10 transition-all duration-200 disabled:opacity-50"
          >
            →
          </Button>
        </div>
      </div>

      {/* Rankings Content */}
      <Card className="border border-slate-200/50 dark:border-slate-800/50 shadow-md rounded-lg backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-teal-500" />
            Recovery Monthly Rankings
            <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
              {formatMonthYear(currentMonth)}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Rankings based on total recovery sessions, streak bonuses, and consistency
          </p>
        </CardHeader>
        <CardContent className="pt-0 px-6 pb-6">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse flex items-center gap-3 p-4 rounded-lg border">
                  <div className="w-10 h-10 bg-teal-200 dark:bg-teal-800 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-purple-200 dark:bg-purple-800 rounded w-3/4"></div>
                    <div className="h-3 bg-purple-100 dark:bg-purple-900 rounded w-1/2"></div>
                  </div>
                  <div className="w-12 h-6 bg-teal-100 dark:bg-teal-900 rounded"></div>
                </div>
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="text-6xl mb-4 transition-transform duration-300 hover:scale-110">🧘‍♂️</div>
              <p className="font-medium text-base mb-2">No recovery rankings found for {formatMonthYear(currentMonth)}</p>
              <p className="text-sm opacity-70">
                Start your recovery journey to appear in the rankings!
              </p>
              <Button 
                onClick={() => window.location.href = '/exercise-hub?tab=recovery'}
                className="mt-4 bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white"
                size="sm"
              >
                <span className="mr-1">🧘‍♂️</span>
                Start Recovery
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {leaderboard.map((user, index) => renderUserCard(user, index))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};