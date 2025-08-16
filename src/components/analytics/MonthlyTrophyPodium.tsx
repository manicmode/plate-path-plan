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
import { useSound } from '@/hooks/useSound';
import { useAuth } from '@/contexts/auth';
import { RecoveryMonthlyRankings } from './RecoveryMonthlyRankings';
import { type ArenaSection, mapAwardToSection, sectionMatches } from '@/lib/arenaSections';

interface MonthlyTrophyPodiumProps {
  section?: ArenaSection;
}

export const MonthlyTrophyPodium: React.FC<MonthlyTrophyPodiumProps> = ({ section = 'combined' }) => {
  const [selectedChallenge, setSelectedChallenge] = useState<CompletedChallenge | null>(null);
  const [winners, setWinners] = useState<PodiumWinner[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<CompletedChallenge[]>([]);
  const [showPodium, setShowPodium] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [celebrationShown, setCelebrationShown] = useState<Set<string>>(new Set());
  
  const { 
    getPodiumWinners, 
    getCompletedChallenges, 
    shouldShowMonthlyPodium, 
    getPodiumMonth,
    isLoading 
  } = useTrophyPodium();
  
  const { toast } = useToast();
  const { playChallengeWin } = useSound();
  const { user } = useAuth();

  useEffect(() => {
    loadCompletedChallenges();
  }, [currentMonth, section]); // Re-filter when section changes

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
      
      // Apply section filtering with text inference
      const withSection = challenges.map(c => ({
        ...c,
        __section: mapAwardToSection(c)
      }));
      
      const filtered = withSection.filter(c => sectionMatches(section, c.__section));
      
      // Update logging with actual filtered results
      console.log('[Awards] section:', section, 'filtered:', filtered.length, 'total:', challenges.length);
      
      setCompletedChallenges(filtered);
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
      
      // Apply section filtering to winners as well
      const winnersWithSection = challengeWinners.map(w => ({
        ...w,
        __section: mapAwardToSection(w)
      }));
      
      const filteredWinners = winnersWithSection.filter(w => sectionMatches(section, w.__section));
      
      setWinners(filteredWinners);
      setShowPodium(true);
      
      // Check if current user won and trigger celebration
      const userWin = filteredWinners.find(w => w.userId === user?.id);
      if (userWin && userWin.podiumPosition <= 3 && 
          !celebrationShown.has(`${challenge.challengeId}-${currentMonth.getMonth()}`)) {
        
        const position = userWin.podiumPosition;
        const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
        const medal = medals[position as keyof typeof medals] || '🏆';
        
        // Trigger celebration popup
        const celebrationEvent = new CustomEvent('showCelebration', {
          detail: {
            message: `You Made the Podium! ${medal}\nPosition #${position} in Monthly Rankings`,
            type: 'monthly_podium'
          }
        });
        window.dispatchEvent(celebrationEvent);
        
        // Play victory sound
        playChallengeWin();
        
        // Mark celebration as shown for this challenge/month
        setCelebrationShown(prev => new Set([...prev, `${challenge.challengeId}-${currentMonth.getMonth()}`]));
      }
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
    <div className="space-y-6">
      {/* Enhanced Header with AWARDS Title */}
      <div className="pt-8 mb-12 flex flex-col items-center gap-6">
        {/* Centered Title with Trophy Emojis */}
        <div className="flex items-center gap-3">
          <div className="text-2xl animate-bounce hover:scale-110 transition-transform duration-300">🏆</div>
          <h1 className="text-4xl font-bold text-center bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
            AWARDS
          </h1>
          <div className="text-2xl animate-bounce hover:scale-110 transition-transform duration-300">🏆</div>
        </div>
        
        {/* Centered Calendar Toggle */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMonthChange('prev')}
            className="h-10 w-10 p-0 rounded-xl border-2 border-yellow-400/50 hover:border-yellow-400 hover:bg-yellow-400/10 transition-all duration-200"
          >
            ←
          </Button>
          <div className="flex items-center gap-3 text-sm font-semibold px-6 py-3 rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 text-yellow-400 border border-yellow-400/30">
            <Calendar className="h-4 w-4" />
            📅 {formatMonthYear(currentMonth)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleMonthChange('next')}
            disabled={currentMonth >= new Date()}
            className="h-10 w-10 p-0 rounded-xl border-2 border-yellow-400/50 hover:border-yellow-400 hover:bg-yellow-400/10 transition-all duration-200 disabled:opacity-50"
          >
            →
          </Button>
        </div>
      </div>

      <Tabs defaultValue="podium" className="space-y-8">
        <div className="mt-8 mb-8">
          <TabsList className="grid w-full grid-cols-4 min-h-[52px] bg-muted/50 backdrop-blur-sm border border-border rounded-xl p-2 gap-2">
            <TabsTrigger 
              value="podium" 
              className="flex items-center justify-center gap-1 text-xs md:text-sm font-medium px-2 md:px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap overflow-hidden data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-yellow-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-md data-[state=active]:shadow-yellow-400/20 hover:bg-accent/50 data-[state=inactive]:text-muted-foreground text-center"
            >
              <span className="text-sm shrink-0">🏆</span>
              <span className="truncate min-w-0" title="Champion's Circle">Champions</span>
            </TabsTrigger>
            <TabsTrigger 
              value="challenges" 
              className="flex items-center justify-center gap-1 text-xs md:text-sm font-medium px-2 md:px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap overflow-hidden data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-yellow-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-md data-[state=active]:shadow-yellow-400/20 hover:bg-accent/50 data-[state=inactive]:text-muted-foreground text-center"
            >
              <span className="text-sm shrink-0">📋</span>
              <span className="truncate min-w-0" title="Select Challenge">Challenges</span>
            </TabsTrigger>
            <TabsTrigger 
              value="recovery-rankings" 
              className="flex items-center justify-center gap-1 text-xs md:text-sm font-medium px-2 md:px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap overflow-hidden data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-400 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-teal-400/20 hover:bg-accent/50 data-[state=inactive]:text-muted-foreground text-center"
            >
              <span className="text-sm shrink-0">🧘‍♂️</span>
              <span className="truncate min-w-0" title="Recovery Rankings">Recovery</span>
            </TabsTrigger>
            <TabsTrigger 
              value="achievements" 
              className="flex items-center justify-center gap-1 text-xs md:text-sm font-medium px-2 md:px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap overflow-hidden data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-yellow-500 data-[state=active]:text-slate-900 data-[state=active]:shadow-md data-[state=active]:shadow-yellow-400/20 hover:bg-accent/50 data-[state=inactive]:text-muted-foreground text-center"
            >
              <span className="text-sm shrink-0">🏅</span>
              <span className="truncate min-w-0" title="Personal Accolades">Awards</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="podium" className="mt-6">
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
            <Card className="border border-slate-200/50 dark:border-slate-800/50 shadow-md rounded-lg backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="text-6xl mb-4 opacity-50 transition-transform duration-300 hover:scale-110">🏆</div>
                <h3 className="text-lg font-semibold mb-2">Welcome to the Champion's Circle</h3>
                <p className="text-muted-foreground mb-4">
                  Select a challenge from the "Select Challenge" tab to view the monthly champions and trophy podium
                </p>
                <div className="text-sm text-muted-foreground/80">
                  🌟 Champions are crowned at the end of each month based on challenge performance
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="challenges" className="mt-6">
          <Card className="border border-slate-200/50 dark:border-slate-800/50 shadow-md rounded-lg backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Select Challenge
              </CardTitle>
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
                  <div className="text-6xl mb-4 transition-transform duration-300 hover:scale-110">🏆</div>
                  <p className="font-medium text-base mb-2">No completed challenges found for {formatMonthYear(currentMonth)}</p>
                  <p className="text-sm opacity-70">
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

        <TabsContent value="recovery-rankings" className="mt-6">
          <RecoveryMonthlyRankings />
        </TabsContent>

        <TabsContent value="achievements" className="mt-6">
          <TrophyShelf />
        </TabsContent>
      </Tabs>
    </div>
  );
};