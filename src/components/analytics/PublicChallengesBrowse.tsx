
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Zap, TrendingUp, Sparkles } from 'lucide-react';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { PublicChallengeCard } from './PublicChallengeCard';
import { LoadingScreen } from '@/components/LoadingScreen';

export const PublicChallengesBrowse: React.FC = () => {
  const {
    challenges = [],
    userParticipations = [],
    loading = false,
    joinChallenge,
    updateProgress,
    leaveChallenge,
    getUserParticipation,
  } = usePublicChallenges();

  // Use real data with proper memoization and safety checks
  const categorizedChallenges = useMemo(() => {
    const safeChallenges = Array.isArray(challenges) ? challenges : [];
    const global = safeChallenges.filter(c => c && c.duration_days >= 7);
    const quick = safeChallenges.filter(c => c && c.duration_days <= 3);
    const trending = safeChallenges.filter(c => c && c.is_trending);
    const newChallenges = safeChallenges.filter(c => c && c.is_new);

    return { global, quick, trending, newChallenges };
  }, [challenges]);

  // Calculate real statistics safely
  const totalParticipants = useMemo(() => {
    const safeChallenges = Array.isArray(challenges) ? challenges : [];
    return safeChallenges.reduce((sum, c) => sum + (c?.participant_count || 0), 0);
  }, [challenges]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Browse Public Challenges</h2>
        <p className="text-muted-foreground">
          Join challenges with people from around the world and build healthy habits together
        </p>
      </div>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Global
          </TabsTrigger>
          <TabsTrigger value="quick" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Quick
          </TabsTrigger>
          <TabsTrigger value="trending" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Trending
          </TabsTrigger>
          <TabsTrigger value="new" className="flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            New
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                🌎 Global Challenges
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Long-term challenges (7+ days) to build lasting habits
              </p>
            </CardHeader>
            <CardContent>
              {categorizedChallenges.global.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No global challenges available right now
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categorizedChallenges.global.map((challenge) => (
                    <PublicChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      participation={getUserParticipation(challenge.id)}
                      onJoin={joinChallenge}
                      onUpdateProgress={updateProgress}
                      onLeave={leaveChallenge}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quick" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                ⚡ Quick Challenges
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Short challenges (1-3 days) for fast engagement and instant wins
              </p>
            </CardHeader>
            <CardContent>
              {categorizedChallenges.quick.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No quick challenges available right now
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {categorizedChallenges.quick.map((challenge) => (
                    <PublicChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      participation={getUserParticipation(challenge.id)}
                      onJoin={joinChallenge}
                      onUpdateProgress={updateProgress}
                      onLeave={leaveChallenge}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                🔥 Trending Challenges
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Most popular challenges with high participation rates
              </p>
            </CardHeader>
            <CardContent>
              {categorizedChallenges.trending.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No trending challenges right now
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categorizedChallenges.trending.map((challenge) => (
                    <PublicChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      participation={getUserParticipation(challenge.id)}
                      onJoin={joinChallenge}
                      onUpdateProgress={updateProgress}
                      onLeave={leaveChallenge}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                ✨ New Challenges
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Recently launched challenges waiting for you to explore
              </p>
            </CardHeader>
            <CardContent>
              {categorizedChallenges.newChallenges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No new challenges available right now
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categorizedChallenges.newChallenges.map((challenge) => (
                    <PublicChallengeCard
                      key={challenge.id}
                      challenge={challenge}
                      participation={getUserParticipation(challenge.id)}
                      onJoin={joinChallenge}
                      onUpdateProgress={updateProgress}
                      onLeave={leaveChallenge}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stats Section with real data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Challenge Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {categorizedChallenges.global.length}
              </div>
              <div className="text-sm text-muted-foreground">Global Challenges</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {categorizedChallenges.quick.length}
              </div>
              <div className="text-sm text-muted-foreground">Quick Challenges</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {categorizedChallenges.trending.length}
              </div>
              <div className="text-sm text-muted-foreground">Trending</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {totalParticipants}
              </div>
              <div className="text-sm text-muted-foreground">Total Participants</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
