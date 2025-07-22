
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Clock, Users, Target, Zap, Globe, Lock, TrendingUp } from 'lucide-react';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';
import { UnifiedChallengeCard } from './UnifiedChallengeCard';

export const UserChallengeParticipations: React.FC = () => {
  const { 
    userParticipations: publicParticipations, 
    challenges: publicChallenges,
    loading: publicLoading,
    updateProgress: updatePublicProgress,
    leaveChallenge: leavePublicChallenge
  } = usePublicChallenges();

  const { 
    challengesWithParticipation: privateChallenges,
    loading: privateLoading,
    updatePrivateProgress,
    refreshData: refreshPrivateData
  } = usePrivateChallenges();

  // Combine and process real data with safety checks
  const processedChallenges = useMemo(() => {
    const safePublicParticipations = Array.isArray(publicParticipations) ? publicParticipations : [];
    const safePublicChallenges = Array.isArray(publicChallenges) ? publicChallenges : [];
    const safePrivateChallenges = Array.isArray(privateChallenges) ? privateChallenges : [];
    
    const publicActiveChallenges = safePublicParticipations.map(participation => {
      const challenge = safePublicChallenges.find(c => c && c.id === participation?.challenge_id);
      if (!challenge || !participation) return null;
      
      return {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        badgeIcon: challenge.badge_icon,
        challengeType: 'global' as const,
        durationDays: challenge.duration_days,
        participantCount: challenge.participant_count,
        targetValue: challenge.target_value,
        targetUnit: challenge.target_unit,
        isParticipating: true,
        isCompleted: participation.is_completed,
        progressPercentage: participation.completion_percentage,
        streakCount: participation.streak_count,
        bestStreak: participation.best_streak,
        isTrending: challenge.is_trending,
        isNew: challenge.is_new,
        difficultyLevel: challenge.difficulty_level,
        isCreator: false,
        onJoin: async () => {},
        onLeave: async () => {
          await leavePublicChallenge(challenge.id);
        },
        showInMyActiveChallenges: true
      };
    }).filter(Boolean);

    const privateActiveChallenges = safePrivateChallenges.map(({ participation, ...challenge }) => {
      if (!participation || !challenge) return null;
      
      return {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        badgeIcon: challenge.badge_icon,
        challengeType: 'friend' as const,
        durationDays: challenge.duration_days,
        participantCount: challenge.max_participants,
        targetValue: challenge.target_value,
        targetUnit: challenge.target_unit,
        isParticipating: true,
        isCompleted: !!participation.completed_at,
        progressPercentage: participation.completion_percentage,
        streakCount: participation.streak_count,
        bestStreak: participation.streak_count, // Private challenges don't track best streak separately
        isTrending: false,
        isNew: false,
        difficultyLevel: 'intermediate',
        isCreator: participation.is_creator,
        onJoin: async () => {},
        onLeave: async () => {
          await refreshPrivateData();
        },
        showInMyActiveChallenges: true
      };
    }).filter(Boolean);

    return [...publicActiveChallenges, ...privateActiveChallenges];
  }, [publicParticipations, publicChallenges, privateChallenges, leavePublicChallenge, refreshPrivateData]);

  // Categorize challenges
  const categorizedChallenges = useMemo(() => {
    const active = processedChallenges.filter(c => !c.isCompleted);
    const completed = processedChallenges.filter(c => c.isCompleted);
    const trending = processedChallenges.filter(c => c.isTrending);
    
    return { active, completed, trending };
  }, [processedChallenges]);

  // Calculate real statistics
  const stats = useMemo(() => {
    const totalActive = categorizedChallenges.active.length;
    const totalCompleted = categorizedChallenges.completed.length;
    const averageProgress = categorizedChallenges.active.length > 0 
      ? Math.round(categorizedChallenges.active.reduce((sum, c) => sum + c.progressPercentage, 0) / categorizedChallenges.active.length)
      : 0;
    const totalStreaks = categorizedChallenges.active.reduce((sum, c) => sum + c.streakCount, 0);
    
    return { totalActive, totalCompleted, averageProgress, totalStreaks };
  }, [categorizedChallenges]);

  const loading = publicLoading || privateLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">Loading your challenges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Trophy className="w-6 h-6" />
          My Active Challenges
        </h2>
        <p className="text-muted-foreground">
          Track your progress and stay motivated with your ongoing challenges
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalActive}</div>
            <div className="text-sm text-muted-foreground">Active Challenges</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600">{stats.totalCompleted}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.averageProgress}%</div>
            <div className="text-sm text-muted-foreground">Avg Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.totalStreaks}</div>
            <div className="text-sm text-muted-foreground">Total Streaks</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Active ({categorizedChallenges.active.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Completed ({categorizedChallenges.completed.length})
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trending ({categorizedChallenges.trending.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {categorizedChallenges.active.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Challenges</h3>
                <p className="text-muted-foreground mb-4">
                  Start your wellness journey by joining a challenge
                </p>
                <Button>
                  Browse Challenges
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categorizedChallenges.active.map((challenge) => (
                <UnifiedChallengeCard
                  key={challenge.id}
                  {...challenge}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {categorizedChallenges.completed.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Completed Challenges</h3>
                <p className="text-muted-foreground">
                  Complete your first challenge to see it here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categorizedChallenges.completed.map((challenge) => (
                <UnifiedChallengeCard
                  key={challenge.id}
                  {...challenge}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          {categorizedChallenges.trending.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Trending Challenges</h3>
                <p className="text-muted-foreground">
                  Join trending challenges to see them here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categorizedChallenges.trending.map((challenge) => (
                <UnifiedChallengeCard
                  key={challenge.id}
                  {...challenge}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
