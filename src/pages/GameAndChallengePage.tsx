
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Users, Calendar, Target, Flame, Star } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useActiveChallenges } from '@/contexts/ActiveChallengesContext';
import { usePublicChallengesContext } from '@/contexts/PublicChallengesContext';
import { useChallengeParticipation } from '@/contexts/ChallengeParticipationContext';
import { LoadingScreen } from '@/components/LoadingScreen';

const GameAndChallengePage = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('active');
  
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

  console.log('GameAndChallengePage: Rendering with data:', {
    activeChallengesCount: activeChallenges.length,
    microChallengesCount: microChallenges.length,
    allChallengesCount: allChallenges.length,
    loading: activeChallengesLoading || publicChallengesLoading || participationLoading,
    errors: { activeChallengesError, publicChallengesError, participationError }
  });

  const loading = activeChallengesLoading || publicChallengesLoading || participationLoading;
  const error = activeChallengesError || publicChallengesError || participationError;

  if (loading) {
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
            <p className="text-muted-foreground text-center mb-4">
              {error}
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
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
    <div className={`min-h-screen bg-background ${isMobile ? 'p-4' : 'p-6'}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className={`font-bold text-primary ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
            🎮 Game & Challenges
          </h1>
          <p className="text-muted-foreground">
            Join challenges, compete with friends, and unlock achievements!
          </p>
        </div>

        {/* Quick Stats */}
        <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-4`}>
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <div className="text-2xl font-bold">{completedChallenges.length}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{totalActiveCount}</div>
              <div className="text-sm text-muted-foreground">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Flame className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <div className="text-2xl font-bold">
                {activeChallenges.length > 0 ? Math.max(...activeChallenges.map(c => c.streakCount)) : 0}
              </div>
              <div className="text-sm text-muted-foreground">Best Streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="text-2xl font-bold">{Math.round(completionRate)}%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            {!isMobile && <TabsTrigger value="micro">Micro</TabsTrigger>}
            {!isMobile && <TabsTrigger value="friends">Friends</TabsTrigger>}
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Your Active Challenges
                </CardTitle>
                <CardDescription>
                  Track your progress and stay motivated!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeChallenges.length > 0 ? (
                  activeChallenges.map((challenge) => (
                    <div key={challenge.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{challenge.name}</h3>
                        <Badge variant={challenge.type === 'micro' ? 'secondary' : 'default'}>
                          {challenge.type}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span>{challenge.progress}%</span>
                        </div>
                        <Progress value={challenge.progress} />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Flame className="h-4 w-4" />
                          {challenge.streakCount} day streak
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {challenge.durationDays} days total
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          const newProgress = Math.min(100, challenge.progress + 10);
                          handleProgressUpdate(challenge.id, newProgress);
                        }}
                      >
                        Update Progress
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No active challenges yet!</p>
                    <p className="text-sm">Browse available challenges to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="browse" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Browse Challenges</CardTitle>
                <CardDescription>
                  Discover new challenges to join and compete!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allChallenges.length > 0 ? (
                  <div className="grid gap-4">
                    {allChallenges.slice(0, 6).map((challenge) => (
                      <div key={challenge.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{challenge.title}</h3>
                          <div className="flex gap-2">
                            {challenge.isTrending && <Badge variant="secondary">Trending</Badge>}
                            {challenge.isNew && <Badge variant="outline">New</Badge>}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{challenge.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {challenge.participantCount} participants
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {challenge.durationDays} days
                          </div>
                          <Badge variant="outline">{challenge.difficulty}</Badge>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => joinChallenge(challenge.id)}
                        >
                          Join Challenge
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No challenges available right now!</p>
                    <p className="text-sm">Check back later for new opportunities.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="micro" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Micro Challenges</CardTitle>
                <CardDescription>
                  Quick 1-3 day challenges for instant motivation!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {microChallenges.length > 0 ? (
                  microChallenges.map((challenge) => (
                    <div key={challenge.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{challenge.name}</h3>
                        <Badge variant="secondary">Micro</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{challenge.goalDescription}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Flame className="h-4 w-4" />
                          {challenge.streakCount} day streak
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {challenge.durationDays} days left
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Flame className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No micro challenges available!</p>
                    <p className="text-sm">New quick challenges will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="friends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Friends & Social</CardTitle>
                <CardDescription>
                  Connect with friends and challenge each other!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Social features coming soon!</p>
                  <p className="text-sm">Invite friends and compete together.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default GameAndChallengePage;
