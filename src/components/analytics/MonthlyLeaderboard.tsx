
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Award, Crown, Star, ChevronDown, ChevronUp, Flame, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  user_id: string;
  name: string;
  nickname: string;
  avatar: string;
  email: string;
  avatar_url?: string;
  total_score: number;
  days_logged: number;
  average_score: number;
  best_score: number;
  current_streak: number;
  rank: number;
  isCurrentUser: boolean;
  consistency: number;
  improvement: number;
  mealsLoggedThisWeek: number;
  totalMealsThisWeek: number;
  weeklyProgress: number;
  dailyStreak: number;
  weeklyStreak: number;
  gold: number;
  silver: number;
  bronze: number;
}

interface MonthlyLeaderboardProps {
  variant?: 'default' | 'game';
}

export const MonthlyLeaderboard: React.FC<MonthlyLeaderboardProps> = ({ variant = 'default' }) => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Extended mock leaderboard data for game variant
      const mockLeaderboard: LeaderboardEntry[] = [
        {
          user_id: '1',
          name: 'Alex Champion',
          nickname: 'Alex 🦄',
          avatar: '🦄',
          email: 'alex@example.com',
          total_score: 2650.5,
          days_logged: 30,
          average_score: 88.4,
          best_score: 97.2,
          current_streak: 15,
          rank: 1,
          isCurrentUser: false,
          consistency: 95,
          improvement: 12,
          mealsLoggedThisWeek: 7,
          totalMealsThisWeek: 7,
          weeklyProgress: 100,
          dailyStreak: 15,
          weeklyStreak: 3,
          gold: 3,
          silver: 2,
          bronze: 1
        },
        {
          user_id: '2', 
          name: 'Sarah Wellness',
          nickname: 'Maya 🌟',
          avatar: '🌟',
          email: 'sarah@example.com',
          total_score: 2580.3,
          days_logged: 29,
          average_score: 89.0,
          best_score: 95.8,
          current_streak: 12,
          rank: 2,
          isCurrentUser: user?.id === '2',
          consistency: 88,
          improvement: 8,
          mealsLoggedThisWeek: 6,
          totalMealsThisWeek: 7,
          weeklyProgress: 86,
          dailyStreak: 12,
          weeklyStreak: 2,
          gold: 2,
          silver: 3,
          bronze: 2
        },
        {
          user_id: '3',
          name: 'Mike Fitness',
          nickname: 'Sam 🔥',
          avatar: '🔥',
          email: 'mike@example.com', 
          total_score: 2510.8,
          days_logged: 28,
          average_score: 89.7,
          best_score: 94.1,
          current_streak: 8,
          rank: 3,
          isCurrentUser: false,
          consistency: 76,
          improvement: -3,
          mealsLoggedThisWeek: 5,
          totalMealsThisWeek: 7,
          weeklyProgress: 71,
          dailyStreak: 8,
          weeklyStreak: 1,
          gold: 1,
          silver: 2,
          bronze: 4
        },
        {
          user_id: user?.id || '4',
          name: user?.name || 'You',
          nickname: 'Jordan 🚀',
          avatar: '🚀',
          email: user?.email || 'you@example.com',
          total_score: 2380.2,
          days_logged: 26,
          average_score: 91.5,
          best_score: 96.5,
          current_streak: 6,
          rank: 4,
          isCurrentUser: true,
          consistency: 92,
          improvement: 15,
          mealsLoggedThisWeek: 7,
          totalMealsThisWeek: 7,
          weeklyProgress: 100,
          dailyStreak: 6,
          weeklyStreak: 1,
          gold: 0,
          silver: 1,
          bronze: 3
        },
        {
          user_id: '5',
          name: 'Emma Strong',
          nickname: 'Casey 🌈',
          avatar: '🌈',
          email: 'emma@example.com',
          total_score: 2320.1,
          days_logged: 25,
          average_score: 92.8,
          best_score: 98.0,
          current_streak: 4,
          rank: 5,
          isCurrentUser: false,
          consistency: 65,
          improvement: -5,
          mealsLoggedThisWeek: 4,
          totalMealsThisWeek: 7,
          weeklyProgress: 57,
          dailyStreak: 4,
          weeklyStreak: 0,
          gold: 1,
          silver: 0,
          bronze: 2
        },
        // Additional users for expansion
        {
          user_id: '6',
          name: 'James Runner',
          nickname: 'James 🏃',
          avatar: '🏃',
          email: 'james@example.com',
          total_score: 2280.7,
          days_logged: 24,
          average_score: 95.0,
          best_score: 99.2,
          current_streak: 3,
          rank: 6,
          isCurrentUser: false,
          consistency: 82,
          improvement: 5,
          mealsLoggedThisWeek: 6,
          totalMealsThisWeek: 7,
          weeklyProgress: 86,
          dailyStreak: 3,
          weeklyStreak: 0,
          gold: 0,
          silver: 2,
          bronze: 1
        },
        {
          user_id: '7',
          name: 'Lisa Health',
          nickname: 'Lisa 🥗',
          avatar: '🥗',
          email: 'lisa@example.com',
          total_score: 2240.9,
          days_logged: 23,
          average_score: 97.4,
          best_score: 100.0,
          current_streak: 2,
          rank: 7,
          isCurrentUser: false,
          consistency: 90,
          improvement: -2,
          mealsLoggedThisWeek: 5,
          totalMealsThisWeek: 7,
          weeklyProgress: 71,
          dailyStreak: 2,
          weeklyStreak: 0,
          gold: 1,
          silver: 1,
          bronze: 0
        },
        {
          user_id: '8',
          name: 'David Power',
          nickname: 'David 💪',
          avatar: '💪',
          email: 'david@example.com',
          total_score: 2200.5,
          days_logged: 22,
          average_score: 100.0,
          best_score: 100.0,
          current_streak: 1,
          rank: 8,
          isCurrentUser: false,
          consistency: 78,
          improvement: 3,
          mealsLoggedThisWeek: 4,
          totalMealsThisWeek: 7,
          weeklyProgress: 57,
          dailyStreak: 1,
          weeklyStreak: 0,
          gold: 0,
          silver: 1,
          bronze: 1
        },
        {
          user_id: '9',
          name: 'Anna Vitality',
          nickname: 'Anna 🌱',
          avatar: '🌱',
          email: 'anna@example.com',
          total_score: 2180.3,
          days_logged: 21,
          average_score: 103.8,
          best_score: 100.0,
          current_streak: 0,
          rank: 9,
          isCurrentUser: false,
          consistency: 68,
          improvement: -8,
          mealsLoggedThisWeek: 3,
          totalMealsThisWeek: 7,
          weeklyProgress: 43,
          dailyStreak: 0,
          weeklyStreak: 0,
          gold: 0,
          silver: 0,
          bronze: 2
        },
        {
          user_id: '10',
          name: 'Chris Endurance',
          nickname: 'Chris 🏋️',
          avatar: '🏋️',
          email: 'chris@example.com',
          total_score: 2150.8,
          days_logged: 20,
          average_score: 107.5,
          best_score: 100.0,
          current_streak: 5,
          rank: 10,
          isCurrentUser: false,
          consistency: 75,
          improvement: 7,
          mealsLoggedThisWeek: 5,
          totalMealsThisWeek: 7,
          weeklyProgress: 71,
          dailyStreak: 5,
          weeklyStreak: 1,
          gold: 0,
          silver: 0,
          bronze: 1
        },
        // Additional users 11-20
        {
          user_id: '11',
          name: 'Sophie Zen',
          nickname: 'Sophie 🧘‍♀️',
          avatar: '🧘‍♀️',
          email: 'sophie@example.com',
          total_score: 2120.4,
          days_logged: 19,
          average_score: 105.2,
          best_score: 98.5,
          current_streak: 3,
          rank: 11,
          isCurrentUser: false,
          consistency: 72,
          improvement: 2,
          mealsLoggedThisWeek: 4,
          totalMealsThisWeek: 7,
          weeklyProgress: 57,
          dailyStreak: 3,
          weeklyStreak: 0,
          gold: 0,
          silver: 1,
          bronze: 0
        },
        {
          user_id: '12',
          name: 'Ryan Swift',
          nickname: 'Ryan ⚡',
          avatar: '⚡',
          email: 'ryan@example.com',
          total_score: 2095.7,
          days_logged: 18,
          average_score: 108.1,
          best_score: 99.8,
          current_streak: 2,
          rank: 12,
          isCurrentUser: false,
          consistency: 69,
          improvement: -1,
          mealsLoggedThisWeek: 3,
          totalMealsThisWeek: 7,
          weeklyProgress: 43,
          dailyStreak: 2,
          weeklyStreak: 0,
          gold: 0,
          silver: 0,
          bronze: 1
        },
        {
          user_id: '13',
          name: 'Maria Sunshine',
          nickname: 'Maria ☀️',
          avatar: '☀️',
          email: 'maria@example.com',
          total_score: 2070.3,
          days_logged: 17,
          average_score: 112.4,
          best_score: 100.0,
          current_streak: 4,
          rank: 13,
          isCurrentUser: false,
          consistency: 71,
          improvement: 6,
          mealsLoggedThisWeek: 5,
          totalMealsThisWeek: 7,
          weeklyProgress: 71,
          dailyStreak: 4,
          weeklyStreak: 1,
          gold: 0,
          silver: 0,
          bronze: 0
        },
        {
          user_id: '14',
          name: 'Tom Ocean',
          nickname: 'Tom 🌊',
          avatar: '🌊',
          email: 'tom@example.com',
          total_score: 2045.9,
          days_logged: 16,
          average_score: 115.7,
          best_score: 98.2,
          current_streak: 1,
          rank: 14,
          isCurrentUser: false,
          consistency: 66,
          improvement: -4,
          mealsLoggedThisWeek: 2,
          totalMealsThisWeek: 7,
          weeklyProgress: 29,
          dailyStreak: 1,
          weeklyStreak: 0,
          gold: 0,
          silver: 0,
          bronze: 0
        },
        {
          user_id: '15',
          name: 'Kelly Mountain',
          nickname: 'Kelly ⛰️',
          avatar: '⛰️',
          email: 'kelly@example.com',
          total_score: 2020.5,
          days_logged: 15,
          average_score: 118.3,
          best_score: 97.5,
          current_streak: 6,
          rank: 15,
          isCurrentUser: false,
          consistency: 73,
          improvement: 9,
          mealsLoggedThisWeek: 6,
          totalMealsThisWeek: 7,
          weeklyProgress: 86,
          dailyStreak: 6,
          weeklyStreak: 1,
          gold: 0,
          silver: 0,
          bronze: 0
        }
      ];

      setLeaderboard(mockLeaderboard);
      
      const userRank = mockLeaderboard.findIndex(entry => entry.user_id === user?.id) + 1;
      setCurrentUserRank(userRank > 0 ? userRank : null);

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <Trophy className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 2: return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 3: return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {variant === 'game' ? 'Live Rankings Arena' : 'Monthly Leaderboard'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderUserEntry = (entry: LeaderboardEntry, index: number) => {
    const rank = entry.rank;
    const isCurrentUser = entry.isCurrentUser;
    
    return (
      <div
        key={entry.user_id}
        className={cn(
          "flex items-center gap-4 p-3 rounded-lg transition-colors",
          isCurrentUser ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50",
          rank <= 3 && variant === 'default' && "bg-gradient-to-r from-muted/30 to-transparent"
        )}
      >
        {/* Rank */}
        <div className="flex items-center justify-center w-10">
          {rank <= 3 ? (
            getRankIcon(rank)
          ) : (
            <Badge variant="secondary" className={getRankBadgeColor(rank)}>
              #{rank}
            </Badge>
          )}
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-2">
          {variant === 'game' ? (
            <div className="text-2xl">{entry.avatar}</div>
          ) : (
            <Avatar className="h-10 w-10">
              <AvatarImage src={entry.avatar_url} />
              <AvatarFallback>
                {entry.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">
              {variant === 'game' ? entry.nickname : entry.name}
              {isCurrentUser && (
                <Badge variant="outline" className="ml-2 text-xs">You</Badge>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{entry.days_logged} days</span>
            <span>Avg: {entry.average_score.toFixed(1)}</span>
            {entry.current_streak > 0 && (
              <span className="flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-500" />
                {entry.current_streak}
              </span>
            )}
            {variant === 'game' && (
              <>
                {entry.improvement > 0 ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="h-3 w-3" />
                    +{entry.improvement}
                  </span>
                ) : entry.improvement < 0 ? (
                  <span className="flex items-center gap-1 text-red-500">
                    <TrendingDown className="h-3 w-3" />
                    {entry.improvement}
                  </span>
                ) : null}
              </>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="text-right">
          <p className="text-lg font-bold text-primary">
            {entry.total_score.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">
            Best: {entry.best_score.toFixed(1)}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card className={cn(
      "overflow-hidden shadow-xl",
      variant === 'game' ? "border-2 border-primary/20" : ""
    )}>
      <CardHeader className={cn(
        variant === 'game' ? "bg-gradient-to-r from-primary/10 to-secondary/10" : "",
        "pb-4"
      )}>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          {variant === 'game' ? 'Live Rankings Arena' : 'Monthly Leaderboard'}
          <Badge variant="outline" className="ml-auto">
            Last 30 Days
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Top 5 Rankings */}
        <div className="space-y-4">
          {leaderboard.slice(0, 5).map((entry, index) => renderUserEntry(entry, index))}
        </div>

        {/* Expand/Collapse Button */}
        {leaderboard.length > 5 && (
          <div className="mt-4">
            <Button
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  View Full Rankings ({leaderboard.length})
                </>
              )}
            </Button>
          </div>
        )}

        {/* Expanded Rankings (6+) */}
        {isExpanded && leaderboard.length > 5 && (
          <div className="mt-4 border-t pt-4">
            <div className="max-h-64 overflow-y-auto space-y-3">
              {leaderboard.slice(5).map((entry, index) => renderUserEntry(entry, index + 5))}
            </div>
          </div>
        )}

        {/* Current User Rank (if not in top 5 and not expanded) */}
        {currentUserRank && currentUserRank > 5 && !isExpanded && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-center text-sm text-muted-foreground">
              You're ranked #{currentUserRank} this month
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
