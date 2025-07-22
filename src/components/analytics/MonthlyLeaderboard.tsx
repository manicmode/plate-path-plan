import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Crown, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { cn } from '@/lib/utils';

interface LeaderboardEntry {
  user_id: string;
  name: string;
  email: string;
  avatar_url?: string;
  total_score: number;
  days_logged: number;
  average_score: number;
  best_score: number;
  current_streak: number;
}

export const MonthlyLeaderboard: React.FC = React.memo(() => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // This would require a more complex query in production
      // For now, we'll simulate leaderboard data
      const mockLeaderboard: LeaderboardEntry[] = [
        {
          user_id: '1',
          name: 'Alex Champion',
          email: 'alex@example.com',
          total_score: 2650.5,
          days_logged: 30,
          average_score: 88.4,
          best_score: 97.2,
          current_streak: 15
        },
        {
          user_id: '2', 
          name: 'Sarah Wellness',
          email: 'sarah@example.com',
          total_score: 2580.3,
          days_logged: 29,
          average_score: 89.0,
          best_score: 95.8,
          current_streak: 12
        },
        {
          user_id: '3',
          name: 'Mike Fitness',
          email: 'mike@example.com', 
          total_score: 2510.8,
          days_logged: 28,
          average_score: 89.7,
          best_score: 94.1,
          current_streak: 8
        },
        {
          user_id: user?.id || '4',
          name: user?.name || 'You',
          email: user?.email || 'you@example.com',
          total_score: 2380.2,
          days_logged: 26,
          average_score: 91.5,
          best_score: 96.5,
          current_streak: 6
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
          <CardTitle>Monthly Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Monthly Leaderboard
          <Badge variant="outline" className="ml-auto">
            Last 30 Days
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leaderboard.map((entry, index) => {
            const rank = index + 1;
            const isCurrentUser = entry.user_id === user?.id;
            
            return (
              <div
                key={entry.user_id}
                className={cn(
                  "flex items-center gap-4 p-3 rounded-lg transition-colors",
                  isCurrentUser ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/50",
                  rank <= 3 && "bg-gradient-to-r from-muted/30 to-transparent"
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
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.avatar_url} />
                  <AvatarFallback>
                    {entry.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">
                      {entry.name}
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
                        <Star className="h-3 w-3" />
                        {entry.current_streak} streak
                      </span>
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
          })}
        </div>

        {currentUserRank && currentUserRank > 4 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-center text-sm text-muted-foreground">
              You're ranked #{currentUserRank} this month
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});