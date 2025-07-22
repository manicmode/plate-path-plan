
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Users, 
  Target, 
  Zap, 
  Crown, 
  Calendar,
  TrendingUp,
  Globe,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { useChallenge } from '@/contexts/ChallengeContext';
import { PublicChallengesBrowse } from '@/components/analytics/PublicChallengesBrowse';
import { UserChallengeParticipations } from '@/components/analytics/UserChallengeParticipations';
import { MyFriendsTab } from '@/components/social/MyFriendsTab';
import { HallOfFame } from '@/components/analytics/HallOfFame';
import { MonthlyTrophyPodium } from '@/components/analytics/MonthlyTrophyPodium';
import { AchievementBadges } from '@/components/analytics/AchievementBadges';
import { MicroChallengeCard } from '@/components/analytics/MicroChallengeCard';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';

const GameAndChallengePage: React.FC = () => {
  console.log("🧪 Game page successfully mounted");
  console.log("🔍 Starting GameAndChallengePage component initialization...");
  
  const [activeTab, setActiveTab] = useState('browse');
  console.log("🔍 useState for activeTab completed");
  
  // Safely access challenge context with comprehensive error handling
  let microChallenges: any[] = [];
  console.log("🔍 About to call useChallenge...");
  try {
    console.log("HOOK START: useChallenge");
    const challengeContext = useChallenge();
    console.log("HOOK END: useChallenge");
    console.log("✅ useChallenge successful:", challengeContext);
    microChallenges = Array.isArray(challengeContext?.microChallenges) ? challengeContext.microChallenges : [];
  } catch (error) {
    console.error('❌ ChallengeProvider error:', error);
    microChallenges = [];
  }
  console.log("🔍 useChallenge completed, microChallenges:", microChallenges);
  
  // Get real data from hooks with comprehensive error handling
  let publicChallenges: any[] = [];
  let publicParticipations: any[] = [];
  let publicLoading = false;
  
  console.log("🔍 About to call usePublicChallenges...");
  try {
    console.log("HOOK START: usePublicChallenges");
    const publicData = usePublicChallenges();
    console.log("HOOK END: usePublicChallenges");
    console.log("✅ usePublicChallenges successful:", publicData);
    publicChallenges = Array.isArray(publicData?.challenges) ? publicData.challenges : [];
    publicParticipations = Array.isArray(publicData?.userParticipations) ? publicData.userParticipations : [];
    publicLoading = Boolean(publicData?.loading);
  } catch (error) {
    console.error('❌ usePublicChallenges error:', error);
    publicChallenges = [];
    publicParticipations = [];
    publicLoading = false;
  }
  console.log("🔍 usePublicChallenges completed");

  let privateChallenges: any[] = [];
  let privateLoading = false;
  
  console.log("🔍 About to call usePrivateChallenges...");
  try {
    console.log("HOOK START: usePrivateChallenges");
    const privateData = usePrivateChallenges();
    console.log("HOOK END: usePrivateChallenges");
    console.log("✅ usePrivateChallenges successful:", privateData);
    privateChallenges = Array.isArray(privateData?.userActiveChallenges) ? privateData.userActiveChallenges : [];
    privateLoading = Boolean(privateData?.loading);
  } catch (error) {
    console.error('❌ usePrivateChallenges error:', error);
    privateChallenges = [];
    privateLoading = false;
  }
  console.log("🔍 usePrivateChallenges completed");
  
  console.log("🔍 All hooks completed, starting render logic...");

  // Calculate real statistics with comprehensive error handling
  const stats = useMemo(() => {
    try {
      const safePublicChallenges = Array.isArray(publicChallenges) ? publicChallenges : [];
      const safePrivateChallenges = Array.isArray(privateChallenges) ? privateChallenges : [];
      const safePublicParticipations = Array.isArray(publicParticipations) ? publicParticipations : [];
      
      const totalPublicChallenges = safePublicChallenges.length;
      const totalPrivateChallenges = safePrivateChallenges.length;
      const totalParticipations = safePublicParticipations.length + safePrivateChallenges.length;
      const trendingCount = safePublicChallenges.filter(c => c?.is_trending === true).length;
      
      return {
        totalPublicChallenges,
        totalPrivateChallenges,
        totalParticipations,
        trendingCount
      };
    } catch (error) {
      console.error('Stats calculation error:', error);
      return {
        totalPublicChallenges: 0,
        totalPrivateChallenges: 0,
        totalParticipations: 0,
        trendingCount: 0
      };
    }
  }, [publicChallenges, privateChallenges, publicParticipations]);

  const loading = publicLoading || privateLoading;

  // Wrap the entire render in try/catch
  try {
    return (
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Gaming & Challenges</h1>
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Join challenges, compete with friends, and unlock achievements on your wellness journey
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {loading ? '...' : (stats?.totalPublicChallenges || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Public Challenges</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {loading ? '...' : (stats?.totalParticipations || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Your Challenges</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {loading ? '...' : (stats?.trendingCount || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Trending</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Array.isArray(microChallenges) ? microChallenges.length : 0}
              </div>
              <div className="text-sm text-muted-foreground">Micro Challenges</div>
            </CardContent>
          </Card>
        </div>

        {/* Micro Challenges Section */}
        {Array.isArray(microChallenges) && microChallenges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                ⚡ Quick Wins - Micro Challenges
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Short, focused challenges you can complete today
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.isArray(microChallenges) ? microChallenges.slice(0, 3).map((challenge) => {
                  try {
                    return (
                      <MicroChallengeCard 
                        key={challenge?.id || Math.random()} 
                        challenge={challenge}
                      />
                    );
                  } catch (error) {
                    console.error('MicroChallengeCard render error:', error);
                    return null;
                  }
                }) : null}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Browse
            </TabsTrigger>
            <TabsTrigger value="my-challenges" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              My Challenges
            </TabsTrigger>
            <TabsTrigger value="friends" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Friends
            </TabsTrigger>
            <TabsTrigger value="achievements" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-6">
            {(() => {
              console.log("🔍 Rendering PublicChallengesBrowse tab...");
              try {
                return <PublicChallengesBrowse />;
              } catch (error) {
                console.error('❌ PublicChallengesBrowse error:', error);
                return (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Unable to load public challenges</p>
                  </div>
                );
              }
            })()}
          </TabsContent>

          <TabsContent value="my-challenges" className="space-y-6">
            {(() => {
              console.log("🔍 Rendering UserChallengeParticipations tab...");
              try {
                // TEMPORARILY COMMENTED OUT TO ISOLATE CRASH
                return (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">My Challenges tab temporarily disabled for debugging</p>
                  </div>
                );
                // return <UserChallengeParticipations />;
              } catch (error) {
                console.error('❌ UserChallengeParticipations error:', error);
                return (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Unable to load your challenges</p>
                  </div>
                );
              }
            })()}
          </TabsContent>

          <TabsContent value="friends" className="space-y-6">
            {(() => {
              console.log("🔍 Rendering MyFriendsTab tab...");
              try {
                // TEMPORARILY COMMENTED OUT TO ISOLATE CRASH
                return (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Friends tab temporarily disabled for debugging</p>
                  </div>
                );
                // return <MyFriendsTab />;
              } catch (error) {
                console.error('❌ MyFriendsTab error:', error);
                return (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Unable to load friends</p>
                  </div>
                );
              }
            })()}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            {(() => {
              console.log("🔍 Rendering AchievementBadges tab...");
              try {
                // TEMPORARILY COMMENTED OUT TO ISOLATE CRASH
                return (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Achievements tab temporarily disabled for debugging</p>
                  </div>
                );
                // return (
                //   <AchievementBadges scoreStats={{
                //     currentScore: 0,
                //     weeklyAverage: 0,
                //     monthlyAverage: 0,
                //     streak: 0,
                //     bestScore: 0
                //   }} />
                // );
              } catch (error) {
                console.error('❌ AchievementBadges error:', error);
                return (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Unable to load achievements</p>
                  </div>
                );
              }
            })()}
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-6">
            {(() => {
              console.log("🔍 Rendering Leaderboard tab...");
              try {
                // TEMPORARILY COMMENTED OUT TO ISOLATE CRASH
                return (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Leaderboard tab temporarily disabled for debugging</p>
                  </div>
                );
                // return (
                //   <div className="space-y-6">
                //     <HallOfFame champions={[]} />
                //     <MonthlyTrophyPodium />
                //   </div>
                // );
              } catch (error) {
                console.error('❌ Leaderboard error:', error);
                return (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Unable to load leaderboard</p>
                  </div>
                );
              }
            })()}
          </TabsContent>
        </Tabs>
      </div>
    );
  } catch (error) {
    console.error("Game page render crash", error);
    return <div style={{ padding: 20 }}>⚠️ Game page render error</div>;
  }
};

export default GameAndChallengePage;
