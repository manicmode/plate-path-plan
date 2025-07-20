
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trophy, Star, Crown, Medal, Award, Sparkles, Quote, Calendar, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

interface HallOfFameProps {
  champions: HallOfFameEntry[];
}

export const HallOfFame: React.FC<HallOfFameProps> = ({ champions }) => {
  const [showAllModal, setShowAllModal] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

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

  // Show first 6 in the preview
  const previewChampions = champions.slice(0, 6);

  return (
    <>
      <Card className="overflow-hidden border-2 border-amber-200 shadow-xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/20 dark:via-yellow-950/20 dark:to-orange-950/20">
        <CardHeader className="bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 text-center relative overflow-hidden">
          {/* Floating sparkles background */}
          <div className="absolute inset-0">
            <div className="absolute top-4 left-8 text-yellow-400 animate-pulse">✨</div>
            <div className="absolute top-8 right-12 text-amber-400 animate-pulse" style={{ animationDelay: '1s' }}>⭐</div>
            <div className="absolute bottom-4 left-16 text-orange-400 animate-pulse" style={{ animationDelay: '2s' }}>💫</div>
            <div className="absolute bottom-8 right-8 text-yellow-500 animate-pulse" style={{ animationDelay: '1.5s' }}>✨</div>
          </div>
          
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3 relative z-10">
            🏆 Hall of Fame
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2 relative z-10">
            Legends who made their mark in nutrition history
          </p>
        </CardHeader>
        
        <CardContent className="p-6">
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
                  style={{
                    animation: `slideInFromRight 0.8s ease-out ${index * 150}ms both`,
                  }}
                >
                  {/* Tilt effect background */}
                  <div className={cn(
                    "absolute inset-0 bg-gradient-to-br opacity-5 transition-opacity duration-300",
                    champion.trophy === 'gold' && "from-yellow-400 to-orange-400",
                    champion.trophy === 'silver' && "from-gray-300 to-gray-500",
                    champion.trophy === 'bronze' && "from-amber-400 to-amber-600",
                    champion.trophy === 'special' && "from-purple-400 to-pink-400",
                    hoveredCard === champion.id && "opacity-20"
                  )} />

                  {/* Confetti for hovered cards */}
                  {hoveredCard === champion.id && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-4 left-4 text-yellow-400 animate-bounce">🎊</div>
                      <div className="absolute top-6 right-6 text-pink-400 animate-bounce" style={{ animationDelay: '0.2s' }}>🎉</div>
                      <div className="absolute bottom-8 left-8 text-blue-400 animate-bounce" style={{ animationDelay: '0.4s' }}>⭐</div>
                    </div>
                  )}

                  {/* Trophy Badge */}
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

                  {/* Avatar */}
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
                      
                      {/* Glow effect for gold champions */}
                      {champion.trophy === 'gold' && (
                        <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-ping" />
                      )}
                    </div>
                  </div>

                  {/* Champion Info */}
                  <div className="text-center mb-4 relative z-10">
                    <h3 className="font-bold text-lg mb-2">{champion.nickname}</h3>
                    <div className="text-sm font-semibold text-primary mb-2">
                      {champion.achievement}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {champion.score.toLocaleString()} points
                    </Badge>
                  </div>

                  {/* Quote */}
                  <div className="relative z-10">
                    <div className="bg-muted/50 rounded-lg p-4 relative">
                      <Quote className="h-4 w-4 text-muted-foreground absolute top-2 left-2" />
                      <blockquote className="text-sm italic text-center mt-2 leading-relaxed">
                        "{champion.quote}"
                      </blockquote>
                    </div>
                  </div>

                  {/* Sparkle trails for special effects */}
                  {hoveredCard === champion.id && champion.trophy === 'gold' && (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="absolute -top-2 -left-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping opacity-75" />
                      <div className="absolute -top-2 -right-2 w-3 h-3 bg-orange-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.5s' }} />
                      <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-yellow-500 rounded-full animate-ping opacity-75" style={{ animationDelay: '1s' }} />
                      <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-amber-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '1.5s' }} />
                    </div>
                  )}
                </div>
              ))}

              {/* See All Button Card */}
              <div className="flex-shrink-0 w-80 p-6 rounded-xl border-2 border-dashed border-muted bg-muted/20 hover:border-primary/40 transition-all duration-300 flex flex-col items-center justify-center min-h-[400px]">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">View All Champions</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Discover more legendary stories and achievements from our hall of fame
                    </p>
                  </div>
                  <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
                    <DialogTrigger asChild>
                      <Button className="flex items-center gap-2">
                        <Trophy className="h-4 w-4" />
                        See All
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <Trophy className="h-6 w-6 text-amber-600" />
              Complete Hall of Fame
              <Badge variant="outline">{champions.length} Champions</Badge>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
              {champions.map((champion) => (
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
    </>
  );
};
