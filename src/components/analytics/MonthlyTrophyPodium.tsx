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
      {/* Header with Month Navigation - Reduced padding */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🏆</div>
              <CardTitle className="text-lg">Trophy Podium Ceremony</CardTitle>
              {shouldShowMonthlyPodium() && (
                <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800">🔥 Live Results</Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange('prev')}
              >
                ←
              </Button>
              <div className="flex items-center gap-1 text-sm font-medium min-w-32 justify-center">
                <Calendar className="h-4 w-4" />
                {formatMonthYear(currentMonth)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMonthChange('next')}
                disabled={currentMonth >= new Date()}
              >
                →
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="challenges" className="space-y-3">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="challenges">Select Challenge</TabsTrigger>
          <TabsTrigger value="podium" disabled={!selectedChallenge}>
            🏆 Trophy Podium
          </TabsTrigger>
          <TabsTrigger value="achievements">
            🏅 My Trophy Shelf
          </TabsTrigger>
        </TabsList>

        <TabsContent value="challenges" className="space-y-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Completed Challenges</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose a challenge to view the month's champions
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? (
                <div className="text-center py-6">
                  <div className="inline-flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Loading challenges...
                  </div>
                </div>
              ) : completedChallenges.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <div className="text-4xl mb-3">🏆</div>
                  <p className="font-medium">No completed challenges found for {formatMonthYear(currentMonth)}</p>
                  <p className="text-xs mt-1 opacity-70">
                    Challenges need at least 2 participants to qualify for the podium
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {completedChallenges.map((challenge) => (
                    <Card 
                      key={challenge.challengeId} 
                      className={`cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${
                        selectedChallenge?.challengeId === challenge.challengeId 
                          ? 'ring-2 ring-primary bg-gradient-to-r from-primary/10 to-secondary/10' 
                          : ''
                      }`}
                      onClick={() => handleChallengeSelect(challenge)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">
                              Challenge {challenge.challengeId.slice(0, 8)}...
                            </h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
                              <Badge variant="secondary" className="text-xs">Popular</Badge>
                            )}
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
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