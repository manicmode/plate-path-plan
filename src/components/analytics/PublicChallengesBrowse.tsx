import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Globe, Zap, TrendingUp, Sparkles } from 'lucide-react';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { PublicChallengeCard } from './PublicChallengeCard';
import { LoadingScreen } from '@/components/LoadingScreen';
import { cn } from '@/lib/utils';
import { RecoveryChallengeBanner } from './RecoveryChallengeBanner';

interface PublicChallengesBrowseProps {
  challengeMode?: 'nutrition' | 'exercise' | 'recovery' | 'combined';
}

export const PublicChallengesBrowse: React.FC<PublicChallengesBrowseProps> = ({ 
  challengeMode = 'combined' 
}) => {
  const {
    globalChallenges,
    quickChallenges,
    trendingChallenges,
    newChallenges,
    loading,
    joinChallenge,
    updateProgress,
    leaveChallenge,
    getUserParticipation,
  } = usePublicChallenges();

  // Filter challenges based on challenge mode
  const getFilteredChallenges = (challenges: any[]) => {
    if (challengeMode === 'combined') return challenges;
    
    if (challengeMode === 'recovery') {
      return challenges.filter(c => 
        ['meditation', 'breathing', 'yoga', 'sleep', 'thermotherapy', 'recovery'].includes(c.category)
      );
    }
    
    return challenges.filter(c => c.category === challengeMode);
  };

  const filteredGlobalChallenges = getFilteredChallenges(globalChallenges);
  const filteredQuickChallenges = getFilteredChallenges(quickChallenges);
  const filteredTrendingChallenges = getFilteredChallenges(trendingChallenges);
  const filteredNewChallenges = getFilteredChallenges(newChallenges);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className={cn(
      "space-y-6",
      challengeMode === 'recovery' && "bg-gradient-to-br from-teal-50/30 to-purple-50/30 dark:from-teal-950/10 dark:to-purple-950/10 rounded-xl p-4"
    )}>
      <div className="text-center space-y-2">
        <h2 className={cn(
          "text-2xl font-bold",
          challengeMode === 'recovery' 
            ? "bg-gradient-to-r from-teal-500 to-purple-500 bg-clip-text text-transparent"
            : ""
        )}>
          Browse {challengeMode === 'recovery' ? '🧘‍♂️ Recovery' : challengeMode === 'combined' ? 'All' : challengeMode.charAt(0).toUpperCase() + challengeMode.slice(1)} Challenges
        </h2>
        <p className="text-muted-foreground">
          {challengeMode === 'recovery' 
            ? 'Join mindfulness challenges for meditation 🧘‍♀️, breathing 🌬️, yoga 🧎‍♀️, sleep 😴, and thermotherapy 🔥'
            : 'Join challenges with people from around the world and build healthy habits together'
          }
        </p>
      </div>

      {/* Recovery Challenge Banner */}
      {challengeMode === 'recovery' && <RecoveryChallengeBanner />}

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
                {challengeMode === 'recovery' ? '🧘‍♂️ Global Recovery Challenges' : '🌎 Global Challenges'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {challengeMode === 'recovery' 
                  ? 'Long-term recovery challenges (7+ days) to build lasting mindfulness habits'
                  : 'Long-term challenges (7+ days) to build lasting habits'
                }
              </p>
            </CardHeader>
            <CardContent>
              {filteredGlobalChallenges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {challengeMode === 'recovery' 
                    ? 'No global recovery challenges available right now'
                    : 'No global challenges available right now'
                  }
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGlobalChallenges.map((challenge) => (
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
                {challengeMode === 'recovery' ? '⚡ Quick Recovery Challenges' : '⚡ Quick Challenges'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {challengeMode === 'recovery' 
                  ? 'Short recovery challenges (1-3 days) for quick mindfulness wins'
                  : 'Short challenges (1-3 days) for fast engagement and instant wins'
                }
              </p>
            </CardHeader>
            <CardContent>
              {filteredQuickChallenges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {challengeMode === 'recovery' 
                    ? 'No quick recovery challenges available right now'
                    : 'No quick challenges available right now'
                  }
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredQuickChallenges.map((challenge) => (
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
                {challengeMode === 'recovery' ? '🔥 Trending Recovery Challenges' : '🔥 Trending Challenges'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {challengeMode === 'recovery' 
                  ? 'Most popular recovery challenges with high participation rates'
                  : 'Most popular challenges with high participation rates'
                }
              </p>
            </CardHeader>
            <CardContent>
              {filteredTrendingChallenges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {challengeMode === 'recovery' 
                    ? 'No trending recovery challenges right now'
                    : 'No trending challenges right now'
                  }
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTrendingChallenges.map((challenge) => (
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
                {challengeMode === 'recovery' ? '✨ New Recovery Challenges' : '✨ New Challenges'}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {challengeMode === 'recovery' 
                  ? 'Recently launched recovery challenges waiting for you to explore'
                  : 'Recently launched challenges waiting for you to explore'
                }
              </p>
            </CardHeader>
            <CardContent>
              {filteredNewChallenges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {challengeMode === 'recovery' 
                    ? 'No new recovery challenges available right now'
                    : 'No new challenges available right now'
                  }
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNewChallenges.map((challenge) => (
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

      {/* Stats Section */}
      <Card className={cn(
        challengeMode === 'recovery' && "border-teal-200/50 dark:border-teal-700/50 bg-gradient-to-br from-teal-50/30 to-purple-50/30 dark:from-teal-950/10 dark:to-purple-950/10"
      )}>
        <CardHeader>
          <CardTitle className={cn(
            "text-center",
            challengeMode === 'recovery' && "text-teal-700 dark:text-teal-300"
          )}>
            {challengeMode === 'recovery' ? '🧘‍♂️ Recovery Challenge Statistics' : 'Challenge Statistics'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {filteredGlobalChallenges.length}
              </div>
              <div className="text-sm text-muted-foreground">Global Challenges</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {filteredQuickChallenges.length}
              </div>
              <div className="text-sm text-muted-foreground">Quick Challenges</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {filteredTrendingChallenges.length}
              </div>
              <div className="text-sm text-muted-foreground">Trending</div>
            </div>
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-primary">
                {filteredGlobalChallenges.reduce((sum, c) => sum + c.participant_count, 0) + 
                 filteredQuickChallenges.reduce((sum, c) => sum + c.participant_count, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Participants</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};