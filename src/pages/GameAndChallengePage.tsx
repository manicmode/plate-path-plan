
import React, { useState, useMemo, useRef } from 'react';
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
  console.count("GameAndChallengePage renders");
  console.log("GameAndChallengePage rendered");
  console.log("🧪 Game page successfully mounted");
  console.log("🔍 Starting GameAndChallengePage component initialization...");
  
  // Render counter to track infinite renders
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  console.log(`🔄 GameAndChallengePage render count: ${renderCountRef.current}`);
  
  const [activeTab, setActiveTab] = useState('browse');
  console.log("🔍 useState for activeTab completed");
  console.log("🎯 Active Tab State:", activeTab);
  
  // Track activeTab changes
  const previousActiveTab = useRef(activeTab);
  if (previousActiveTab.current !== activeTab) {
    console.log("🎯 Tab changed from", previousActiveTab.current, "to", activeTab);
    previousActiveTab.current = activeTab;
  }
  
  // Move hook calls to top level to avoid conditional hook calls
  console.log("🔍 About to call useChallenge...");
  const challengeHookStart = performance.now();
  const challengeContext = useChallenge();
  const challengeHookTime = performance.now() - challengeHookStart;
  console.log("HOOK END: useChallenge", `took ${challengeHookTime}ms`);
  console.log("✅ useChallenge result:", {
    challenges: challengeContext?.challenges?.length,
    microChallenges: challengeContext?.microChallenges?.length,
    activeUserChallenges: challengeContext?.activeUserChallenges?.length
  });
  
  // Deep diagnostic on challenge context value stability
  const challengeContextRef = useRef<typeof challengeContext>();
  if (challengeContextRef.current !== challengeContext) {
    console.log("🚨 ChallengeContext changed:", {
      previous: challengeContextRef.current,
      current: challengeContext,
      challengesChanged: challengeContextRef.current?.challenges !== challengeContext?.challenges,
      microChallengesChanged: challengeContextRef.current?.microChallenges !== challengeContext?.microChallenges
    });
    challengeContextRef.current = challengeContext;
  }
  
  console.log("🔍 About to call usePublicChallenges...");
  const publicHookStart = performance.now();
  const publicData = usePublicChallenges();
  const publicHookTime = performance.now() - publicHookStart;
  console.log("HOOK END: usePublicChallenges", `took ${publicHookTime}ms`);
  console.log("✅ usePublicChallenges result:", {
    challenges: publicData?.challenges?.length,
    userParticipations: publicData?.userParticipations?.length,
    loading: publicData?.loading
  });

  console.log("🔍 About to call usePrivateChallenges...");
  const privateHookStart = performance.now();
  const privateData = usePrivateChallenges();
  const privateHookTime = performance.now() - privateHookStart;
  console.log("HOOK END: usePrivateChallenges", `took ${privateHookTime}ms`);
  console.log("✅ usePrivateChallenges result:", {
    userActiveChallenges: privateData?.userActiveChallenges?.length,
    loading: privateData?.loading
  });
  
  console.log("🔍 All hooks completed, starting render logic...");

  // Use hook results directly with stable references
  const microChallenges = useMemo(() => {
    const result = Array.isArray(challengeContext?.microChallenges) ? challengeContext.microChallenges : [];
    console.log("🔄 microChallenges memoization - deps:", challengeContext?.microChallenges);
    return result;
  }, [challengeContext?.microChallenges]);
  
  const publicChallenges = useMemo(() => {
    const result = Array.isArray(publicData?.challenges) ? publicData.challenges : [];
    console.log("🔄 publicChallenges memoization - deps:", publicData?.challenges);
    return result;
  }, [publicData?.challenges]);
  
  const publicParticipations = useMemo(() => {
    const result = Array.isArray(publicData?.userParticipations) ? publicData.userParticipations : [];
    console.log("🔄 publicParticipations memoization - deps:", publicData?.userParticipations);
    return result;
  }, [publicData?.userParticipations]);
  
  const privateChallenges = useMemo(() => {
    const result = Array.isArray(privateData?.userActiveChallenges) ? privateData.userActiveChallenges : [];
    console.log("🔄 privateChallenges memoization - deps:", privateData?.userActiveChallenges);
    return result;
  }, [privateData?.userActiveChallenges]);

  const publicLoading = Boolean(publicData?.loading);
  const privateLoading = Boolean(privateData?.loading);

  // Calculate real statistics with comprehensive error handling (moved before using it)
  const stats = useMemo(() => {
    console.log("🔄 stats memoization triggered - deps:", {
      publicChallenges: publicChallenges?.length,
      privateChallenges: privateChallenges?.length,
      publicParticipations: publicParticipations?.length
    });
    
    try {
      const safePublicChallenges = Array.isArray(publicChallenges) ? publicChallenges : [];
      const safePrivateChallenges = Array.isArray(privateChallenges) ? privateChallenges : [];
      const safePublicParticipations = Array.isArray(publicParticipations) ? publicParticipations : [];
      
      const totalPublicChallenges = safePublicChallenges.length;
      const totalPrivateChallenges = safePrivateChallenges.length;
      const totalParticipations = safePublicParticipations.length + safePrivateChallenges.length;
      const trendingCount = safePublicChallenges.filter(c => c?.is_trending === true).length;
      
      const result = {
        totalPublicChallenges,
        totalPrivateChallenges,
        totalParticipations,
        trendingCount,
        // Add mock data for AchievementBadges compatibility
        currentScore: totalParticipations * 10,
        weeklyAverage: totalParticipations * 8,
        monthlyAverage: totalParticipations * 9,
        streak: Math.min(totalParticipations, 7),
        bestScore: totalParticipations * 12
      };
      
      console.log("📊 Stats calculated:", result);
      return result;
    } catch (error) {
      console.error('Stats calculation error:', error);
      return {
        totalPublicChallenges: 0,
        totalPrivateChallenges: 0,
        totalParticipations: 0,
        trendingCount: 0,
        currentScore: 0,
        weeklyAverage: 0,
        monthlyAverage: 0,
        streak: 0,
        bestScore: 0
      };
    }
  }, [publicChallenges, privateChallenges, publicParticipations]);

  // Memoize tab content rendering to prevent unnecessary re-renders when activeTab changes
  const renderTabContent = useMemo(() => {
    console.log("🎯 renderTabContent memoization triggered - should only happen when dependencies change");
    console.log("📊 Creating Browse tab content");
    console.log("🎯 Creating My Challenges tab content");
    console.log("👥 Creating Friends tab content");
    console.log("🏆 Creating Achievements tab content");
    console.log("👑 Creating Leaderboard tab content");
    console.log("🔄 renderTabContent deps - stats:", stats);
    
    const tabContent: Record<string, React.ReactNode> = {
      browse: <PublicChallengesBrowse />,
      'my-challenges': <UserChallengeParticipations />,
      friends: <MyFriendsTab />,
      achievements: <AchievementBadges scoreStats={stats} />,
      leaderboard: <MonthlyTrophyPodium />
    };
    return tabContent;
  }, [stats]);

  const loading = publicLoading || privateLoading;
  
  // Track dependency changes for all major dependencies
  const depsRef = useRef<Record<string, any>>({});
  const currentDeps = {
    activeTab,
    publicData,
    privateData,
    challengeContext,
    stats,
    loading
  };
  
  Object.entries(currentDeps).forEach(([key, value]) => {
    if (depsRef.current[key] !== value) {
      console.log(`🔄 Dependency changed: ${key}`, {
        previous: depsRef.current[key],
        current: value
      });
      depsRef.current[key] = value;
    }
  });

  console.log("🎯 Final render state:", {
    activeTab,
    loading,
    microChallengesCount: microChallenges?.length,
    publicChallengesCount: publicChallenges?.length,
    privateChallengesCount: privateChallenges?.length,
    statsCalculated: !!stats
  });

  // Add layout re-render tracking
  console.count('⚠️ Layout Re-render');

  // Wrap the entire render in try/catch
  try {
    return (
      <div 
        style={{
          transform: 'translateZ(0)',
          willChange: 'transform',
          contain: 'layout paint size style',
          overflow: 'hidden'
        }}
      >
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" key={activeTab}>
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

          <TabsContent 
            value="browse" 
            className="space-y-6"
            style={{ minHeight: '300px', transition: 'none' }}
          >
            {renderTabContent['browse']}
          </TabsContent>

          <TabsContent 
            value="my-challenges" 
            className="space-y-6"
            style={{ minHeight: '300px', transition: 'none' }}
          >
            {renderTabContent['my-challenges']}
          </TabsContent>

          <TabsContent 
            value="friends" 
            className="space-y-6"
            style={{ minHeight: '300px', transition: 'none' }}
          >
            {renderTabContent['friends']}
          </TabsContent>

          <TabsContent 
            value="achievements" 
            className="space-y-6"
            style={{ minHeight: '300px', transition: 'none' }}
          >
            {renderTabContent['achievements']}
          </TabsContent>

          <TabsContent 
            value="leaderboard" 
            className="space-y-6"
            style={{ minHeight: '300px', transition: 'none' }}
          >
            {renderTabContent['leaderboard']}
          </TabsContent>
        </Tabs>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Game page render crash", error);
    return <div style={{ padding: 20 }}>⚠️ Game page render error</div>;
  }
};

export default GameAndChallengePage;
