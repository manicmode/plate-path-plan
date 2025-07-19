import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Users, TrendingUp, Target, Crown, Flame, Medal } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  member_ids: string[];
  current_score: number;
  total_progress: number;
  team_rank: number;
  member_names: string[];
}

interface TeamLeaderboardProps {
  challengeId: string;
  userTeamId?: string;
}

export const TeamLeaderboard: React.FC<TeamLeaderboardProps> = ({ challengeId, userTeamId }) => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (challengeId) {
      fetchTeamLeaderboard();
    }
  }, [challengeId]);

  const fetchTeamLeaderboard = async () => {
    try {
      const { data: teamsData, error } = await supabase
        .from('challenge_teams')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('team_rank', { ascending: true });

      if (error) throw error;

      if (teamsData) {
        // Get member names for each team
        const teamsWithNames = await Promise.all(
          teamsData.map(async (team) => {
            const { data: profiles } = await supabase
              .from('user_profiles')
              .select('user_id, first_name, last_name')
              .in('user_id', team.member_ids);

            const memberNames = profiles?.map(p => 
              `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Member'
            ) || [];

            return {
              ...team,
              member_names: memberNames
            };
          })
        );

        setTeams(teamsWithNames);

        // Find user's team
        if (user && userTeamId) {
          const userTeamData = teamsWithNames.find(t => t.id === userTeamId);
          setUserTeam(userTeamData || null);
        }
      }
    } catch (error) {
      console.error('Error fetching team leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <Trophy className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getGapMessage = (userTeam: Team, teams: Team[]) => {
    if (!userTeam || userTeam.team_rank === 1) return null;

    const teamAbove = teams.find(t => t.team_rank === userTeam.team_rank - 1);
    if (!teamAbove) return null;

    const gap = teamAbove.current_score - userTeam.current_score;
    return {
      gap: Math.round(gap),
      teamName: teamAbove.name,
      rank: teamAbove.team_rank
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const gapMessage = userTeam ? getGapMessage(userTeam, teams) : null;

  return (
    <div className="space-y-6">
      {/* User Team Highlight */}
      {userTeam && (
        <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Your Team Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getRankIcon(userTeam.team_rank)}
                  <div>
                    <h3 className="font-semibold text-lg">{userTeam.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Rank #{userTeam.team_rank} • {userTeam.member_names.join(', ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">
                    {Math.round(userTeam.current_score)}
                  </div>
                  <div className="text-sm text-muted-foreground">points</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Team Progress</span>
                  <span>{Math.round(userTeam.total_progress)}%</span>
                </div>
                <Progress value={userTeam.total_progress} className="h-2" />
              </div>

              {gapMessage && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                    <Flame className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Your team is just {gapMessage.gap} points away from {gapMessage.teamName} (#{gapMessage.rank})!
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Team Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No teams found for this challenge</p>
            </div>
          ) : (
            <div className="space-y-3">
              {teams.map((team, index) => {
                const isUserTeam = userTeam?.id === team.id;
                
                return (
                  <div
                    key={team.id}
                    className={`p-4 rounded-lg border transition-all ${
                      isUserTeam 
                        ? 'bg-primary/5 border-primary/20 ring-1 ring-primary/20' 
                        : 'bg-muted/20 border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getRankIcon(team.team_rank)}
                          <span className="font-bold text-lg">#{team.team_rank}</span>
                        </div>
                        
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {team.name}
                            {isUserTeam && (
                              <Badge variant="secondary" className="text-xs">Your Team</Badge>
                            )}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span>{team.member_names.join(', ')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xl font-bold">
                          {Math.round(team.current_score)}
                        </div>
                        <div className="text-sm text-muted-foreground">points</div>
                        
                        <div className="flex items-center gap-1 mt-1">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span className="text-xs text-green-600">
                            {Math.round(team.total_progress)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <Progress 
                        value={team.total_progress} 
                        className="h-1"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Performance Insights */}
      {teams.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Team Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Leading Team</span>
                </div>
                <span className="text-sm text-yellow-700 dark:text-yellow-300">
                  {teams[0]?.name} with {Math.round(teams[0]?.current_score || 0)} points
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Most Consistent</span>
                </div>
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {teams.sort((a, b) => b.total_progress - a.total_progress)[0]?.name}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Closest Competition</span>
                </div>
                <span className="text-sm text-green-700 dark:text-green-300">
                  {teams.length > 1 && Math.round((teams[1]?.current_score || 0) - (teams[0]?.current_score || 0))} point gap
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};