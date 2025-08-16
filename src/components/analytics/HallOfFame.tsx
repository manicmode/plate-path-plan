import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Star, Crown, Medal, Award, Sparkles, Quote, Calendar, ArrowRight, Heart, ThumbsUp, Smile, Pin, MessageCircle, Eye, Loader2, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHallOfFame, Trophy as TrophyType, Tribute as TributeType } from '@/hooks/useHallOfFame';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';
import { useExerciseHallOfFame } from '@/hooks/useExerciseHallOfFame';
import { type ArenaSection, mapChampionToSection, sectionMatches } from '@/lib/arenaSections';

interface HallOfFameEntry {
  id: number;
  nickname: string;
  avatar: string;
  achievement: string;
  month: string;
  year: string;
  quote: string;
  score: number;
  trophy: 'gold' | 'silver' | 'bronze' | 'special';
  user_id?: string; // Add user_id for real champion data
}

interface HallOfFameProps {
  champions: HallOfFameEntry[];
  challengeMode: ArenaSection;
}

export const HallOfFame: React.FC<HallOfFameProps> = ({ 
  champions,
  challengeMode = 'combined'
}) => {
  // Apply section filtering to champions
  const filteredChampions = React.useMemo(() => {
    const withSection = champions.map(c => ({
      ...c,
      __section: mapChampionToSection(c)
    }));
    
    const filtered = withSection.filter(c => sectionMatches(challengeMode, c.__section));
    
    // Log filtering results
    console.log('[HallOfFame] section:', challengeMode, 'filtered:', filtered.length, 'total:', champions.length);
    
    return filtered;
  }, [champions, challengeMode]);
  const { user } = useAuth();
  const { toast } = useToast();
  const { monthlyAwards, isLoading: exerciseLoading, error: exerciseError } = useExerciseHallOfFame();
  const [showAllModal, setShowAllModal] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [showAllTributes, setShowAllTributes] = useState(false);
  const [newTribute, setNewTribute] = useState('');
  const [celebratingCard, setCelebratingCard] = useState<number | null>(null);

  // Get the first (current year) champion for trophy showcase and tributes
  const currentChampion = filteredChampions.find(c => c.trophy === 'gold') || filteredChampions[0];
  const championUserId = currentChampion?.user_id;
  
  // Debug logging to help identify issues
  console.log('Current champion:', currentChampion);
  console.log('Champion user ID:', championUserId);
  
  // Show warning if championUserId is missing
  React.useEffect(() => {
    if (currentChampion && !championUserId) {
      console.warn('Champion found but user_id is missing:', currentChampion);
    }
  }, [currentChampion, championUserId]);
  
  const { 
    trophies: yearlyTrophies, 
    tributes, 
    loading, 
    postTribute, 
    handleReaction: handleReactionFromHook, 
    handlePinTribute: handlePinTributeFromHook 
  } = useHallOfFame(championUserId);

  const getTrophyIcon = (trophy: string) => {
    switch (trophy) {
      case 'gold': return <Crown className="h-5 w-5 text-yellow-500" />;
      case 'silver': return <Medal className="h-5 w-5 text-gray-400" />;
      case 'bronze': return <Award className="h-5 w-5 text-amber-600" />;
      case 'special': return <Star className="h-5 w-5 text-purple-500" />;
      default: return <Trophy className="h-5 w-5 text-primary" />;
    }
  };

  const getTrophyBadgeColor = (trophy: string) => {
    switch (trophy) {
      case 'gold': return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 'silver': return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 'bronze': return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
      case 'special': return 'bg-gradient-to-r from-purple-400 to-purple-600 text-white';
      default: return 'bg-primary text-primary-foreground';
    }
  };

  const getCardGlowColor = (trophy: string) => {
    switch (trophy) {
      case 'gold': return 'hover:shadow-yellow-200 dark:hover:shadow-yellow-900/50';
      case 'silver': return 'hover:shadow-gray-200 dark:hover:shadow-gray-900/50';
      case 'bronze': return 'hover:shadow-amber-200 dark:hover:shadow-amber-900/50';
      case 'special': return 'hover:shadow-purple-200 dark:hover:shadow-purple-900/50';
      default: return 'hover:shadow-primary/20';
    }
  };

  const getBadgeTypeStyle = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return {
          border: 'border-yellow-400',
          background: 'from-yellow-400/20 to-orange-500/20',
          badgeClass: 'bg-yellow-400 text-black border-yellow-500'
        };
      case 'rare':
        return {
          border: 'border-blue-400',
          background: 'from-blue-400/20 to-cyan-500/20',
          badgeClass: 'bg-blue-400 text-white border-blue-500'
        };
      case 'common':
      default:
        return {
          border: 'border-gray-400',
          background: 'from-gray-400/20 to-gray-500/20',
          badgeClass: 'bg-gray-400 text-white border-gray-500'
        };
    }
  };

  const getExerciseTrophyEmoji = (awardLevel: string) => {
    switch (awardLevel) {
      case 'gold': return '🥇';
      case 'silver': return '🥈';
      case 'bronze': return '🥉';
      default: return '💪';
    }
  };

  const getExerciseTrophyTitle = (awardLevel: string) => {
    switch (awardLevel) {
      case 'gold': return 'Gold Achiever';
      case 'silver': return 'Silver Champion';
      case 'bronze': return 'Bronze Warrior';
      default: return 'Keep Going!';
    }
  };

  const getMonthName = (month: number) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1];
  };

  const handleCardCelebration = (championId: number) => {
    setCelebratingCard(championId);
    setTimeout(() => setCelebratingCard(null), 3000);
  };

  const renderCelebrationAnimation = (championId: number) => {
    if (celebratingCard !== championId) return null;
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={`celebration-${i}`} className="absolute text-3xl animate-bounce" style={{
            left: `${Math.random() * 80 + 10}%`, top: `${Math.random() * 80 + 10}%`,
            animationDelay: `${Math.random() * 1}s`
          }}>🎉</div>
        ))}
      </div>
    );
  };

  const handleSubmitTribute = async () => {
    if (!newTribute.trim() || !championUserId || !user) {
      toast({ title: "Error", description: "Unable to post tribute", variant: "destructive" });
      return;
    }
    const success = await postTribute(newTribute);
    if (success) {
      setNewTribute('');
      toast({ title: "Success", description: "Your tribute has been posted!" });
    } else {
      toast({ title: "Error", description: "Failed to post tribute", variant: "destructive" });
    }
  };

  const renderExerciseHallOfFame = () => {
    if (exerciseLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg border animate-pulse">
              <div className="h-16 w-16 bg-muted rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
              <div className="h-6 w-20 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      );
    }

    if (exerciseError) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Dumbbell className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">Unable to load exercise awards</p>
          <p className="text-sm">{exerciseError}</p>
        </div>
      );
    }

    if (monthlyAwards.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Dumbbell className="h-16 w-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">No workout trophies yet</p>
          <p className="text-sm">Complete workouts to earn your first trophy! 💪</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {monthlyAwards.map((award) => (
          <div
            key={award.id}
            className={cn(
              "p-6 rounded-xl border-2 transition-all duration-300 hover:scale-105 cursor-pointer relative overflow-hidden",
              "bg-background/80 backdrop-blur-sm",
              award.awardLevel === 'gold' && "border-yellow-300 shadow-yellow-200 dark:shadow-yellow-900/50",
              award.awardLevel === 'silver' && "border-gray-300 shadow-gray-200 dark:shadow-gray-900/50",
              award.awardLevel === 'bronze' && "border-amber-300 shadow-amber-200 dark:shadow-amber-900/50",
              award.awardLevel === 'none' && "border-blue-300 shadow-blue-200 dark:shadow-blue-900/50"
            )}
          >
            {/* Personal Best Badge */}
            {award.isPersonalBest && (
              <div className="absolute top-2 right-2">
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs">
                  🏆 Personal Best
                </Badge>
              </div>
            )}

            {/* Trophy Display */}
            <div className="flex items-center gap-4 mb-4">
              <div className={cn(
                "h-16 w-16 rounded-full flex items-center justify-center text-3xl shadow-lg",
                award.awardLevel === 'gold' && "bg-gradient-to-br from-yellow-400 to-yellow-600",
                award.awardLevel === 'silver' && "bg-gradient-to-br from-gray-400 to-gray-600",
                award.awardLevel === 'bronze' && "bg-gradient-to-br from-amber-400 to-amber-600",
                award.awardLevel === 'none' && "bg-gradient-to-br from-blue-400 to-blue-600"
              )}>
                {getExerciseTrophyEmoji(award.awardLevel)}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">
                  {getExerciseTrophyTitle(award.awardLevel)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {award.workoutCount} workouts
                </p>
              </div>
            </div>

            {/* Month/Year Display */}
            <div className="text-center">
              <Badge variant="outline" className="mb-2">
                <Calendar className="h-3 w-3 mr-1" />
                {getMonthName(award.month)} {award.year}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Show first 6 in the preview
  const previewChampions = filteredChampions.slice(0, 6);
  const displayedTributes = showAllTributes ? tributes : tributes.slice(0, 3);
  const pinnedTributes = tributes.filter(t => t.isPinned);
  const unpinnedTributes = tributes.filter(t => !t.isPinned);
  const sortedTributes = [...pinnedTributes, ...unpinnedTributes];

  return (
    <div className="space-y-8">
      {/* Main Hall of Fame Card */}
      <Card className="overflow-hidden border-2 border-amber-200 shadow-xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/20 dark:via-yellow-950/20 dark:to-orange-950/20">
        <CardHeader className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 text-center relative overflow-hidden p-6">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 left-4 text-yellow-400 animate-pulse text-lg">⭐</div>
            <div className="absolute top-2 right-4 text-amber-400 animate-pulse text-lg" style={{ animationDelay: '1s' }}>⭐</div>
            <div className="absolute bottom-2 left-6 text-orange-400 animate-pulse text-sm" style={{ animationDelay: '2s' }}>✨</div>
            <div className="absolute bottom-2 right-6 text-yellow-500 animate-pulse text-sm" style={{ animationDelay: '1.5s' }}>✨</div>
          </div>
          
          <CardTitle className="text-3xl font-bold text-center relative z-20 flex items-center justify-center gap-3 px-4">
            🏆 Hall of Fame 🏆
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2 relative z-10">
            {challengeMode === 'exercise' 
              ? 'Your monthly workout achievements and trophies'
              : 'Legends who made their mark in nutrition history'
            }
          </p>
        </CardHeader>
        
        <CardContent className="p-6">
          {challengeMode === 'exercise' ? (
            <Tabs defaultValue="monthly-awards" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="monthly-awards" className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Monthly Awards
                </TabsTrigger>
                <TabsTrigger value="achievements" className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Achievements
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="monthly-awards" className="mt-6">
                {renderExerciseHallOfFame()}
              </TabsContent>
              
              <TabsContent value="achievements" className="mt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Award className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium mb-2">Coming Soon</p>
                  <p className="text-sm">Special exercise achievements will be displayed here</p>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <ScrollArea className="w-full">
              <div className="flex gap-6 pb-4 min-w-max">
                {previewChampions.map((champion, index) => (
                  <div
                    key={champion.id}
                    className={cn(
                      "flex-shrink-0 w-80 p-6 rounded-xl border-2 transition-all duration-500 cursor-pointer relative overflow-hidden",
                      "hover:scale-105 hover:shadow-2xl transform-gpu",
                      getCardGlowColor(champion.trophy),
                      hoveredCard === champion.id 
                        ? "border-primary shadow-xl shadow-primary/20" 
                        : "border-muted bg-background/80 backdrop-blur-sm"
                    )}
                    onMouseEnter={() => setHoveredCard(champion.id)}
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => handleCardCelebration(champion.id)}
                    style={{
                      animation: `slideInFromRight 0.8s ease-out ${index * 150}ms both`,
                    }}
                  >
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-5 transition-opacity duration-300",
                      champion.trophy === 'gold' && "from-yellow-400 to-orange-400",
                      champion.trophy === 'silver' && "from-gray-300 to-gray-500",
                      champion.trophy === 'bronze' && "from-amber-400 to-amber-600",
                      champion.trophy === 'special' && "from-purple-400 to-pink-400",
                      hoveredCard === champion.id && "opacity-20"
                    )} />

                    {hoveredCard === champion.id && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-4 left-4 text-yellow-400 animate-bounce">🎊</div>
                        <div className="absolute top-6 right-6 text-pink-400 animate-bounce" style={{ animationDelay: '0.2s' }}>🎉</div>
                        <div className="absolute bottom-8 left-8 text-blue-400 animate-bounce" style={{ animationDelay: '0.4s' }}>⭐</div>
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <Badge className={cn("flex items-center gap-2 text-sm font-bold", getTrophyBadgeColor(champion.trophy))}>
                        {getTrophyIcon(champion.trophy)}
                        {champion.trophy.toUpperCase()}
                      </Badge>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {champion.month} {champion.year}
                      </div>
                    </div>

                    <div className="flex justify-center mb-4 relative z-10">
                      <div className={cn(
                        "relative transition-transform duration-300",
                        hoveredCard === champion.id && "scale-110"
                      )}>
                        <Avatar className="h-20 w-20 text-4xl border-4 border-background shadow-lg">
                          <AvatarFallback className="text-4xl bg-gradient-to-br from-primary/20 to-secondary/20">
                            {champion.avatar}
                          </AvatarFallback>
                        </Avatar>
                        
                        {champion.trophy === 'gold' && (
                          <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping" />
                        )}
                      </div>
                    </div>

                    <div className="text-center mb-4 relative z-10">
                      <h3 className="font-bold text-lg mb-2">{champion.nickname}</h3>
                      <div className="text-sm font-semibold text-primary mb-2">
                        {champion.achievement}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {champion.score.toLocaleString()} points
                      </Badge>
                    </div>

                    <div className="relative z-10">
                      <div className="bg-muted/50 rounded-lg p-4 relative">
                        <Quote className="h-4 w-4 text-muted-foreground absolute top-2 left-2" />
                        <blockquote className="text-sm italic text-center mt-2 leading-relaxed">
                          "{champion.quote}"
                        </blockquote>
                      </div>
                    </div>

                    {hoveredCard === champion.id && champion.trophy === 'gold' && (
                      <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-75" />
                        <div className="absolute -top-2 -right-2 w-3 h-3 bg-orange-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.5s' }} />
                        <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-yellow-500 rounded-full animate-ping opacity-75" style={{ animationDelay: '1s' }} />
                        <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-amber-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '1.5s' }} />
                      </div>
                    )}

                    {/* Celebration Animation */}
                    {renderCelebrationAnimation(champion.id)}
                  </div>
                ))}

                <div className="flex-shrink-0 w-80 p-6 rounded-xl border-2 border-dashed border-primary/60 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary transition-all duration-300 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
                  <div className="text-center space-y-4 w-full relative z-10">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">View All Champions</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Discover more legendary stories and achievements from our hall of fame
                      </p>
                    </div>
                    <div className="flex justify-center w-full">
                      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
                        <DialogTrigger asChild>
                          <Button className="flex items-center gap-2 mx-auto">
                            <Trophy className="h-4 w-4" />
                            See All
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Trophy Showcase Section - Only show for nutrition mode */}
      {challengeMode !== 'exercise' && (
        <Card className="-mt-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-yellow-400/30">
          <CardHeader className="p-6">
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-orange-400 via-yellow-400 to-yellow-500 bg-clip-text text-transparent flex items-center justify-center gap-2">
              🏆 Trophy Showcase {new Date().getFullYear()}
            </CardTitle>
            <p className="text-center text-muted-foreground">
              All badges and trophies earned this year
            </p>
          </CardHeader>
          <CardContent className="p-6">
            {yearlyTrophies.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium mb-2">No trophies yet for this year</p>
                <p className="text-sm">Keep grinding 💪</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {yearlyTrophies.map((trophy) => {
                  const badgeTypeStyle = getBadgeTypeStyle(trophy.rarity);
                  
                  return (
                    <div
                      key={trophy.id}
                      className={cn(
                        "p-6 rounded-lg border-2 bg-gradient-to-br text-center transition-all duration-300 hover:scale-105 cursor-pointer relative overflow-hidden",
                        badgeTypeStyle.border,
                        badgeTypeStyle.background
                      )}
                    >
                      {trophy.rarity === 'legendary' && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-200%] animate-[shine_3s_ease-in-out_infinite]" />
                      )}
                      
                      <div className="text-6xl mb-4">{trophy.icon}</div>
                      <h4 className="font-bold text-white text-lg mb-2">{trophy.name}</h4>
                      
                      <div className="mb-3">
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs font-semibold", badgeTypeStyle.badgeClass)}
                        >
                          {trophy.rarity.toUpperCase()}
                        </Badge>
                      </div>
                      
                      {trophy.badgeType && (
                        <p className="text-sm text-white/80 mb-2 font-medium">
                          {trophy.badgeType}
                        </p>
                      )}
                      
                      <p className="text-xs text-white/60">
                        {new Date(trophy.dateEarned).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tributes & Comments Section - Only show for nutrition mode */}
      {challengeMode !== 'exercise' && (
        <Card>
          <CardHeader className="p-6">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              Tributes & Comments
              <Badge variant="outline">{tributes.length}</Badge>
            </CardTitle>
            <p className="text-muted-foreground">
              Congratulatory messages from the community
            </p>
          </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Add new tribute form - Only show if we have a valid champion */}
          {championUserId ? (
            <div className="bg-muted/30 rounded-lg p-4">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>YOU</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <textarea
                    placeholder="Leave a congratulatory message..."
                    value={newTribute}
                    onChange={(e) => setNewTribute(e.target.value)}
                    className="w-full p-3 rounded-lg border bg-background resize-none min-h-[80px]"
                  />
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-2 transition-transform hover:scale-110" 
                        onClick={() => {
                          setNewTribute(prev => prev + "🚀");
                        }}
                      >
                        🚀
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-2 transition-transform hover:scale-110" 
                        onClick={() => {
                          setNewTribute(prev => prev + "🎉");
                        }}
                      >
                        🎉
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-2 transition-transform hover:scale-110" 
                        onClick={() => {
                          setNewTribute(prev => prev + "👏");
                        }}
                      >
                        👏
                      </Button>
                    </div>
                    <Button 
                      size="sm"
                      disabled={!newTribute.trim() || loading}
                      onClick={handleSubmitTribute}
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Post Tribute
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <p className="text-muted-foreground">
                Champion information not available for tributes
              </p>
            </div>
          )}

          {/* Tributes list */}
          <div className="space-y-4">
            {tributes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium mb-2">No tributes yet</p>
                <p className="text-sm">Be the first to leave a congratulatory message!</p>
              </div>
            ) : (
              (showAllTributes ? sortedTributes : sortedTributes.slice(0, 3)).map((tribute) => (
                <div 
                  key={tribute.id} 
                  className={cn(
                    "p-4 rounded-lg border transition-all duration-200",
                    tribute.isPinned 
                      ? "bg-primary/5 border-primary/20 relative" 
                      : "bg-background hover:bg-muted/30"
                  )}
                >
                  {tribute.isPinned && (
                    <div className="absolute top-2 right-2">
                      <Pin className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{tribute.authorAvatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{tribute.authorName}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(tribute.timestamp).toLocaleDateString()}
                        </span>
                         {!tribute.isPinned && user?.id === championUserId && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 ml-auto"
                            onClick={() => handlePinTributeFromHook(tribute.id)}
                          >
                            <Pin className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm leading-relaxed">{tribute.message}</p>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        {tribute.reactions.map((reaction, index) => (
                          <Button
                            key={index}
                            size="sm"
                            variant={reaction.userReacted ? "secondary" : "ghost"}
                            className="h-7 px-2 text-xs"
                            onClick={() => handleReactionFromHook(tribute.id, reaction.emoji)}
                          >
                            {reaction.emoji} {reaction.count}
                          </Button>
                        ))}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleReactionFromHook(tribute.id, '👏')}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Show more/less button */}
          {tributes.length > 3 && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => setShowAllTributes(!showAllTributes)}
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                {showAllTributes ? 'Show Less' : `View All ${tributes.length} Comments`}
              </Button>
            </div>
          )}
          </CardContent>
        </Card>
      )}

      {/* Dialog for viewing all champions */}
      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <Trophy className="h-6 w-6 text-amber-600" />
              Complete Hall of Fame
              <Badge variant="outline">{filteredChampions.length} Champions</Badge>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
              {filteredChampions.map((champion) => (
                <div
                  key={champion.id}
                  className="p-4 rounded-lg border bg-background hover:shadow-lg transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-12 w-12 text-2xl">
                      <AvatarFallback className="text-2xl bg-gradient-to-br from-primary/20 to-secondary/20">
                        {champion.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold">{champion.nickname}</div>
                      <div className="text-xs text-muted-foreground">{champion.month} {champion.year}</div>
                    </div>
                    <Badge className={cn("text-xs", getTrophyBadgeColor(champion.trophy))}>
                      {getTrophyIcon(champion.trophy)}
                    </Badge>
                  </div>
                  
                  <div className="text-sm font-medium text-primary mb-2">
                    {champion.achievement}
                  </div>
                  
                  <blockquote className="text-sm italic text-muted-foreground border-l-2 border-primary/20 pl-3">
                    "{champion.quote}"
                  </blockquote>
                  
                  <div className="mt-3 text-right">
                    <Badge variant="outline" className="text-xs">
                      {champion.score.toLocaleString()} pts
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};