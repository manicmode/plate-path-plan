
import React, { useState, Suspense, lazy } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  Users, 
  Target, 
  Crown, 
  Star,
  TrendingUp,
  Calendar,
  Award,
  Flame,
  Plus,
  Zap,
  Globe
} from 'lucide-react';
import { useActiveChallenges } from '@/contexts/ActiveChallengesContext';
import { usePublicChallengesContext } from '@/contexts/PublicChallengesContext';
import { useChallengeParticipation } from '@/contexts/ChallengeParticipationContext';
import { useAuth } from '@/contexts/auth';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useIsMobile } from '@/hooks/use-mobile';

// Direct imports instead of lazy loading to avoid build errors for now
import { PublicChallengesBrowse } from '@/components/analytics/PublicChallengesBrowse';
import { MonthlyTrophyPodium } from '@/components/analytics/MonthlyTrophyPodium';
import { HallOfFame } from '@/components/analytics/HallOfFame';
import { ChallengeCreationModal } from '@/components/analytics/ChallengeCreationModal';

const GameAndChallengePage = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const {
    activeChallenges,
    microChallenges,
    completedChallenges,
    totalActiveCount,
    completionRate,
    loading: activeChallengesLoading,
    error: activeChallengesError
  } = useActiveChallenges();

  const {
    allChallenges,
    quickChallenges,
    globalChallenges,
    trendingChallenges,
    newChallenges,
    loading: publicChallengesLoading,
    error: publicChallengesError,
    joinChallenge,
    leaveChallenge
  } = usePublicChallengesContext();

  const {
    updateProgress,
    loading: participationLoading,
    error: participationError
  } = useChallengeParticipation();

  const loading = activeChallengesLoading || publicChallengesLoading || participationLoading;
  const error = activeChallengesError || publicChallengesError || participationError;

  // Calculate user stats
  const userStats = {
    totalChallenges: activeChallenges.length + completedChallenges.length,
    activeChallenges: totalActiveCount,
    completedChallenges: completedChallenges.length,
    averageProgress: activeChallenges.length > 0 
      ? activeChallenges.reduce((sum, c) => sum + (c.progress || 0), 0) / activeChallenges.length 
      : 0,
    currentStreak: activeChallenges.length > 0 ? Math.max(...activeChallenges.map(c => c.streakCount || 0)) : 0,
    successRate: completionRate
  };

  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );

  if (loading && !activeChallenges.length && !allChallenges.length) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Loading Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleProgressUpdate = (challengeId: string, newProgress: number) => {
    updateProgress({ challengeId, value: newProgress });
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Trophy className="h-8 w-8 text-yellow-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
              Game & Challenges
            </h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join challenges, compete with friends, and achieve your health goals together! 🚀
          </p>
        </div>

        {/* Quick Stats Banner */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-2 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-4`}>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-blue-600">{userStats.activeChallenges}</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-green-600">{userStats.completedChallenges}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-2xl font-bold text-orange-600">{Math.round(userStats.averageProgress)}%</div>
                <div className="text-sm text-muted-foreground">Avg Progress</div>
              </div>
              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-1">
                  <Flame className="h-5 w-5 text-red-500" />
                  <span className="text-2xl font-bold text-red-600">{userStats.currentStreak}</span>
                </div>
                <div className="text-sm text-muted-foreground">Day Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3 h-12' : 'grid-cols-5 h-12'} max-w-3xl mx-auto`}>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Active</span>
            </TabsTrigger>
            <TabsTrigger value="browse" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">Browse</span>
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Ranking</span>
            </TabsTrigger>
            {!isMobile && (
              <TabsTrigger value="hall-of-fame" className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                <span className="hidden sm:inline">Hall of Fame</span>
              </TabsTrigger>
            )}
            {!isMobile && (
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Friends</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Active Tab */}
          <TabsContent value="active" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Your Active Challenges</h2>
                <p className="text-muted-foreground">Track your progress and stay motivated</p>
              </div>
              <Button 
                onClick={() => setShowChallengeModal(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Challenge
              </Button>
            </div>

            {activeChallenges.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent className="space-y-4">
                  <Target className="h-16 w-16 text-muted-foreground mx-auto" />
                  <div>
                    <h3 className="text-xl font-semibold">No Active Challenges</h3>
                    <p className="text-muted-foreground">Join or create a challenge to get started!</p>
                  </div>
                  <Button onClick={() => setActiveTab('browse')} variant="outline">
                    Browse Challenges
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Micro Challenges Section */}
                {microChallenges.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <h3 className="text-lg font-semibold">Micro Challenges</h3>
                      <Badge variant="secondary" className="text-xs">Quick Wins</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {microChallenges.map((challenge) => (
                        <Card key={challenge.id} className="overflow-hidden border-2 border-yellow-200 dark:border-yellow-800">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                <Zap className="h-3 w-3 mr-1" />
                                Micro
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {challenge.durationDays} days
                              </Badge>
                            </div>
                            <CardTitle className="text-lg line-clamp-2">{challenge.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Progress</span>
                                <span className="font-medium">{challenge.progress || 0}%</span>
                              </div>
                              <Progress value={challenge.progress || 0} className="h-2" />
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => handleProgressUpdate(challenge.id, Math.min(100, (challenge.progress || 0) + 25))}
                            >
                              Update Progress
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regular Challenges Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Active Challenges</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {activeChallenges.map((challenge) => {
                      const userProgress = challenge.progress || 0;
                      const timeLeft = Math.max(0, (challenge.durationDays || 0) * 24 * 60 * 60 * 1000);
                      const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
                      
                      return (
                        <Card key={challenge.id} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <Badge variant={challenge.type === 'public' ? 'default' : 'secondary'}>
                                {challenge.type}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {daysLeft > 0 ? `${daysLeft} days left` : 'Active'}
                              </Badge>
                            </div>
                            <CardTitle className="text-lg line-clamp-2">{challenge.name || challenge.goalDescription}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Your Progress</span>
                                <span className="font-medium">{userProgress}%</span>
                              </div>
                              <Progress value={userProgress} className="h-2" />
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-1">
                                <Flame className="h-3 w-3 text-orange-500" />
                                <span>{challenge.streakCount || 0} day streak</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500" />
                                <span>Rank #{Math.floor(Math.random() * 10) + 1}</span>
                              </div>
                            </div>

                            <Button 
                              variant="outline" 
                              className="w-full"
                              onClick={() => handleProgressUpdate(challenge.id, Math.min(100, userProgress + 10))}
                            >
                              Update Progress
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Browse Tab */}
          <TabsContent value="browse" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Discover Challenges</h2>
              <p className="text-muted-foreground">Find and join challenges that match your goals</p>
            </div>
            
            <PublicChallengesBrowse />
          </TabsContent>

          {/* Ranking Tab */}
          <TabsContent value="ranking" className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Monthly Rankings</h2>
              <p className="text-muted-foreground">See who's leading the challenges this month</p>
            </div>
            
            <MonthlyTrophyPodium />
          </TabsContent>

          {/* Hall of Fame Tab */}
          <TabsContent value="hall-of-fame" className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Crown className="h-6 w-6 text-yellow-500" />
                <h2 className="text-2xl font-bold">Hall of Fame</h2>
              </div>
              <p className="text-muted-foreground">Celebrating our greatest champions and achievers</p>
            </div>
            
            <HallOfFame />
          </TabsContent>

          {/* Friends Tab */}
          <TabsContent value="friends" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Friends & Social</h2>
              <p className="text-muted-foreground">Challenge your friends and build healthy habits together</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Friends' Active Challenges */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Friends' Challenges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Your friends' challenges will appear here</p>
                    <p className="text-sm">Connect with friends to see their progress</p>
                  </div>
                </CardContent>
              </Card>

              {/* Challenge Invitations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Invitations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Challenge invitations will appear here</p>
                    <p className="text-sm">Friends can invite you to join their challenges</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Invite Friends to Challenge</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Create a challenge and invite your friends to join you on your health journey.
                </p>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Invite Friends to Challenge
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Challenge Creation Modal */}
        {showChallengeModal && (
          <ChallengeCreationModal
            open={showChallengeModal}
            onOpenChange={setShowChallengeModal}
            friends={[]} // Would be populated with actual friends data
          />
        )}
      </div>
    </div>
  );
};

export default GameAndChallengePage;
