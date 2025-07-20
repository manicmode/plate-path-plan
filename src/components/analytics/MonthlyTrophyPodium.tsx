import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Trophy, Users, Clock, ExternalLink } from 'lucide-react';
import { TrophyPodium, PodiumWinner } from './TrophyPodium';
import { TrophyShelf } from './TrophyShelf';
import { useTrophyPodium, CompletedChallenge } from '@/hooks/useTrophyPodium';
import { useToast } from '@/hooks/use-toast';

export const MonthlyTrophyPodium: React.FC = () => {
  const [selectedChallenge, setSelectedChallenge] = useState<CompletedChallenge | null>(null);
  const [winners, setWinners] = useState<PodiumWinner[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<CompletedChallenge[]>([]);
  const [showPodium, setShowPodium] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const { 
    getPodiumWinners, 
    getCompletedChallenges, 
    shouldShowMonthlyPodium, 
    getPodiumMonth,
    isLoading 
  } = useTrophyPodium();
  
  const { toast } = useToast();

  useEffect(() => {
    loadCompletedChallenges();
  }, [currentMonth]);

  useEffect(() => {
    // Auto-show podium if it's end of month
    if (shouldShowMonthlyPodium() && completedChallenges.length > 0) {
      // Auto-select the most recent challenge with most participants
      const topChallenge = completedChallenges
        .sort((a, b) => b.participantCount - a.participantCount)[0];
      if (topChallenge) {
        handleChallengeSelect(topChallenge);
      }
    }
  }, [completedChallenges, shouldShowMonthlyPodium]);

  const loadCompletedChallenges = async () => {
    try {
      const challenges = await getCompletedChallenges(currentMonth);
      setCompletedChallenges(challenges);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load completed challenges",
        variant: "destructive"
      });
    }
  };

  const handleChallengeSelect = async (challenge: CompletedChallenge) => {
    try {
      setSelectedChallenge(challenge);
      const challengeWinners = await getPodiumWinners(challenge.challengeId, currentMonth);
      setWinners(challengeWinners);
      setShowPodium(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load challenge winners",
        variant: "destructive"
      });
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
    setShowPodium(false);
    setSelectedChallenge(null);
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="space-y-4">
      {/* Enhanced Header with Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div 
            className="text-3xl transition-transform duration-300 hover:scale-110 flex items-center justify-center" 
            style={{ 
              animation: 'bounce 0.6s ease-in-out 3', 
              animationDelay: '0.5s'
            }}
          >
            🏆
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent flex items-center">
              Winners' Podium
            </h2>
            {shouldShowMonthlyPodium() && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 animate-pulse">
                🔥 Live
              </Badge>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMonthChange('prev')}
            className="h-10 w-10 p-0 rounded-xl border-2 border-yellow-400/50 hover:border-yellow-400 hover:bg-yellow-400/10 transition-all duration-300 hover:scale-110 hover:shadow-lg"
          >
            ←
          </Button>
          <Button
            variant="outline"
            className="flex items-center gap-2 text-sm font-semibold min-w-36 justify-center px-4 py-2 h-10 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-yellow-400 border-2 border-yellow-400/30 hover:border-yellow-400 hover:scale-105 hover:shadow-lg transition-all duration-300 hover:glow"
          >
            <Calendar className="h-4 w-4" />
            {formatMonthYear(currentMonth)}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMonthChange('next')}
            disabled={currentMonth >= new Date()}
            className="h-10 w-10 p-0 rounded-xl border-2 border-yellow-400/50 hover:border-yellow-400 hover:bg-yellow-400/10 transition-all duration-300 hover:scale-110 hover:shadow-lg disabled:opacity-50 disabled:hover:scale-100"
          >
            →
          </Button>
        </div>
      </div>

      <Tabs defaultValue="challenges" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-14 bg-background/95 backdrop-blur-sm border-2 border-border/50 rounded-2xl p-2 shadow-xl gap-2">
          <TabsTrigger 
            value="challenges" 
            className="relative text-sm font-semibold px-4 py-3 rounded-xl transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis
              data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-yellow-500 
              data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:border-2 data-[state=active]:border-yellow-600
              data-[state=active]:ring-2 data-[state=active]:ring-yellow-300/50 data-[state=active]:scale-105
              hover:bg-yellow-400/20 hover:scale-102 hover:shadow-md
              border-2 border-transparent text-muted-foreground
              data-[state=active]:animate-pulse"
          >
            Select Challenge
          </TabsTrigger>
          <TabsTrigger 
            value="podium" 
            disabled={!selectedChallenge} 
            className="relative text-sm font-semibold px-4 py-3 rounded-xl transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis
              data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-yellow-500 
              data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:border-2 data-[state=active]:border-yellow-600
              data-[state=active]:ring-2 data-[state=active]:ring-yellow-300/50 data-[state=active]:scale-105
              hover:bg-yellow-400/20 hover:scale-102 hover:shadow-md
              border-2 border-transparent text-muted-foreground
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Winners' Podium
          </TabsTrigger>
          <TabsTrigger 
            value="achievements" 
            className="relative text-sm font-semibold px-4 py-3 rounded-xl transition-all duration-300 whitespace-nowrap overflow-hidden text-ellipsis
              data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-yellow-500 
              data-[state=active]:text-black data-[state=active]:shadow-lg data-[state=active]:border-2 data-[state=active]:border-yellow-600
              data-[state=active]:ring-2 data-[state=active]:ring-yellow-300/50 data-[state=active]:scale-105
              hover:bg-yellow-400/20 hover:scale-102 hover:shadow-md
              border-2 border-transparent text-muted-foreground"
          >
            Personal Accolades
          </TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="space-y-4">
          <Card className="border border-slate-200/50 dark:border-slate-800/50 shadow-md rounded-lg backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">Completed Challenges</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose a challenge to view the month's champions
              </p>
            </CardHeader>
            <CardContent className="pt-0 px-6 pb-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Loading challenges...
                  </div>
                </div>
              ) : completedChallenges.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="mb-6 flex items-center justify-center">
                    <div className="text-6xl transition-transform duration-300 hover:scale-110">🏆</div>
                  </div>
                  <h3 className="font-bold text-lg mb-3 text-foreground">🏆 No champions yet this month!</h3>
                  <p className="font-medium text-base mb-4 text-foreground">Join a challenge and aim for the podium!</p>
                  <p className="text-sm text-muted-foreground/70">
                    Challenges need at least 2 participants to qualify for the podium
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {completedChallenges.map((challenge) => (
                    <Card 
                      key={challenge.challengeId} 
                      className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border rounded-lg ${
                        selectedChallenge?.challengeId === challenge.challengeId 
                          ? 'ring-2 ring-yellow-400/50 bg-gradient-to-r from-yellow-50/50 to-orange-50/50 border-yellow-300 dark:from-yellow-900/20 dark:to-orange-900/20 dark:border-yellow-600' 
                          : 'border-slate-200 dark:border-slate-700 hover:border-yellow-300 dark:hover:border-yellow-600'
                      }`}
                      onClick={() => handleChallengeSelect(challenge)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm mb-1">
                              Challenge {challenge.challengeId.slice(0, 8)}...
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {challenge.participantCount} participants
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {getTimeAgo(challenge.completionDate)}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {challenge.participantCount >= 5 && (
                              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Popular</Badge>
                            )}
                            <ExternalLink className="h-4 w-4 text-muted-foreground transition-colors hover:text-yellow-500" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="podium" className="space-y-3">
          {selectedChallenge && winners.length > 0 ? (
            <TrophyPodium
              winners={winners}
              challengeName={`Challenge ${selectedChallenge.challengeId.slice(0, 8)}...`}
              isVisible={showPodium}
              onReplay={() => {
                toast({
                  title: "🎬 Replaying Ceremony",
                  description: "Enjoy the podium animation again!",
                });
              }}
              onComplete={() => {
                toast({
                  title: "🏆 Ceremony Complete",
                  description: "Congratulations to all winners!",
                });
              }}
            />
          ) : selectedChallenge ? (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3">🏆</div>
                <p className="text-muted-foreground">
                  No winners found for this challenge in {formatMonthYear(currentMonth)}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-4xl mb-3 opacity-50">🏆</div>
                <p className="text-muted-foreground">
                  Select a challenge to view the trophy podium
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="achievements" className="space-y-3">
          <TrophyShelf />
        </TabsContent>
      </Tabs>
    </div>
  );
};