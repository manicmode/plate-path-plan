import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Crown, Zap, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HallOfFameUser {
  user_id: string;
  username: string;
  display_name: string;
  year: number;
  yearly_score: number;
  monthly_trophies: number;
  avg_nutrition_streak: number;
  avg_hydration_streak: number;
  avg_supplement_streak: number;
  total_active_days: number;
  total_messages: number;
  rank_position: number;
}

const HallOfFamePage: React.FC = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [hallOfFameData, setHallOfFameData] = useState<HallOfFameUser[]>([]);
  const [archivedYears, setArchivedYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchHallOfFameData();
    fetchArchivedYears();
  }, [selectedYear]);

  const fetchHallOfFameData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('yearly_hall_of_fame')
        .select('*')
        .eq('year', selectedYear)
        .order('rank_position', { ascending: true });

      if (error) throw error;
      setHallOfFameData(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading Hall of Fame",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivedYears = async () => {
    try {
      const { data, error } = await supabase
        .from('yearly_hall_of_fame')
        .select('year')
        .neq('year', selectedYear);

      if (error) throw error;
      
      const years = [...new Set(data?.map(item => item.year) || [])].sort((a, b) => b - a);
      setArchivedYears(years);
    } catch (error: any) {
      console.error('Error fetching archived years:', error);
    }
  };

  const getSpecialBadge = (user: HallOfFameUser, allUsers: HallOfFameUser[]) => {
    if (user.rank_position === 1) {
      return { icon: Crown, text: "🔥 GOAT", variant: "default" as const };
    }
    
    const highestStreak = Math.max(
      user.avg_nutrition_streak,
      user.avg_hydration_streak,
      user.avg_supplement_streak
    );
    
    const maxStreakUser = allUsers.reduce((max, current) => {
      const currentMaxStreak = Math.max(
        current.avg_nutrition_streak,
        current.avg_hydration_streak,
        current.avg_supplement_streak
      );
      const maxMaxStreak = Math.max(
        max.avg_nutrition_streak,
        max.avg_hydration_streak,
        max.avg_supplement_streak
      );
      return currentMaxStreak > maxMaxStreak ? current : max;
    });
    
    if (user.user_id === maxStreakUser.user_id) {
      return { icon: Zap, text: "💎 Consistency King", variant: "secondary" as const };
    }
    
    if (user.monthly_trophies >= 3) {
      return { icon: Trophy, text: "🏆 Champion", variant: "outline" as const };
    }
    
    return null;
  };

  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 1: return 'h-32';
      case 2: return 'h-24';
      case 3: return 'h-20';
      default: return 'h-16';
    }
  };

  const getPodiumColor = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-t from-yellow-400 to-yellow-300';
      case 2: return 'bg-gradient-to-t from-gray-400 to-gray-300';
      case 3: return 'bg-gradient-to-t from-orange-400 to-orange-300';
      default: return 'bg-gradient-to-t from-muted to-muted/50';
    }
  };

  const getTrophyEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  const topThree = hallOfFameData.slice(0, 3);
  const restOfUsers = hallOfFameData.slice(3);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          🏆 Hall of Fame {selectedYear}
        </h1>
        <p className="text-muted-foreground">
          The ultimate leaderboard of our most dedicated users
        </p>
      </div>

      {/* Year Selection */}
      <div className="flex justify-center gap-2 flex-wrap">
        {[selectedYear, selectedYear - 1, selectedYear - 2].map(year => (
          <Button
            key={year}
            variant={year === selectedYear ? "default" : "outline"}
            onClick={() => setSelectedYear(year)}
            className="min-w-20"
          >
            {year}
          </Button>
        ))}
      </div>

      {hallOfFameData.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Hall of Fame data yet</h3>
            <p className="text-muted-foreground">
              Complete some challenges and activities to see rankings for {selectedYear}!
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top 3 Podium */}
          {topThree.length > 0 && (
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="text-center text-2xl">🏆 Champions Podium</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center items-end gap-4 mb-8">
                  {/* Arrange podium: 2nd, 1st, 3rd */}
                  {[topThree[1], topThree[0], topThree[2]].filter(Boolean).map((user, index) => {
                    const actualRank = user.rank_position;
                    const specialBadge = getSpecialBadge(user, hallOfFameData);
                    
                    return (
                      <div
                        key={user.user_id}
                        className={`flex flex-col items-center animate-scale-in`}
                        style={{ animationDelay: `${index * 200}ms` }}
                      >
                        {/* User Info */}
                        <div className="text-center mb-4 space-y-2">
                          <Avatar className="w-16 h-16 mx-auto border-4 border-background shadow-lg">
                            <AvatarFallback className="text-lg font-bold">
                              {user.display_name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-bold text-lg">{user.display_name}</h3>
                            <p className="text-sm text-muted-foreground">{user.yearly_score.toFixed(0)} pts</p>
                            {specialBadge && (
                              <Badge variant={specialBadge.variant} className="text-xs mt-1">
                                {specialBadge.text}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Podium */}
                        <div className={`
                          ${getPodiumHeight(actualRank)} ${getPodiumColor(actualRank)}
                          w-24 rounded-t-lg border border-border/50 shadow-lg
                          flex flex-col justify-end items-center p-2
                          animate-fade-in
                        `}>
                          <div className="text-2xl mb-1">{getTrophyEmoji(actualRank)}</div>
                          <div className="text-xs font-bold text-background/80">#{actualRank}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Full Rankings */}
          <Card>
            <CardHeader>
              <CardTitle>Complete Rankings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {hallOfFameData.map((user, index) => {
                const specialBadge = getSpecialBadge(user, hallOfFameData);
                
                return (
                  <div
                    key={user.user_id}
                    className={`
                      flex items-center justify-between p-4 rounded-lg border
                      ${user.rank_position <= 3 ? 'bg-gradient-to-r from-primary/10 to-transparent border-primary/20' : 'bg-muted/30'}
                      hover:bg-muted/50 transition-colors
                    `}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="text-center min-w-12">
                        <div className="text-2xl font-bold">
                          {user.rank_position <= 3 ? getTrophyEmoji(user.rank_position) : `#${user.rank_position}`}
                        </div>
                      </div>
                      
                      {/* Avatar & Name */}
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>
                          {user.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <h3 className="font-semibold">{user.display_name}</h3>
                        <p className="text-sm text-muted-foreground">@{user.username}</p>
                      </div>
                      
                      {/* Special Badge */}
                      {specialBadge && (
                        <Badge variant={specialBadge.variant}>
                          {specialBadge.text}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-lg">{user.yearly_score.toFixed(0)}</div>
                        <div className="text-muted-foreground">Score</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-bold">{user.monthly_trophies}</div>
                        <div className="text-muted-foreground">🏆</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-bold">{user.total_active_days}</div>
                        <div className="text-muted-foreground">Days</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-bold">
                          {Math.max(
                            user.avg_nutrition_streak,
                            user.avg_hydration_streak,
                            user.avg_supplement_streak
                          ).toFixed(0)}
                        </div>
                        <div className="text-muted-foreground">Best Streak</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Archived Years */}
          {archivedYears.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5" />
                  Previous Years
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {archivedYears.map(year => (
                    <Button
                      key={year}
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedYear(year)}
                      className="hover-scale"
                    >
                      Hall of Fame {year}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default HallOfFamePage;