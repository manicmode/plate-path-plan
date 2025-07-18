import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Crown, Medal, Award, Sparkles } from 'lucide-react';
import { ProgressAvatar } from '@/components/analytics/ui/ProgressAvatar';
import { cn } from '@/lib/utils';

interface PodiumContender {
  id: number;
  nickname: string;
  avatar: string;
  score: number;
  weeklyProgress: number;
  dailyStreak: number;
  position: 1 | 2 | 3;
}

interface PodiumOfTheMonthProps {
  contenders: PodiumContender[];
}

export const PodiumOfTheMonth: React.FC<PodiumOfTheMonthProps> = ({ contenders }) => {
  const getPodiumHeight = (position: number) => {
    switch (position) {
      case 1: return 'h-32'; // Gold - tallest
      case 2: return 'h-24'; // Silver - medium
      case 3: return 'h-20'; // Bronze - shortest
      default: return 'h-20';
    }
  };

  const getPodiumColor = (position: number) => {
    switch (position) {
      case 1: return 'bg-gradient-to-t from-yellow-400 via-yellow-300 to-yellow-200 border-yellow-500';
      case 2: return 'bg-gradient-to-t from-gray-400 via-gray-300 to-gray-200 border-gray-500';
      case 3: return 'bg-gradient-to-t from-amber-600 via-amber-400 to-amber-300 border-amber-600';
      default: return 'bg-muted';
    }
  };

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="h-6 w-6 text-yellow-600" />;
      case 2: return <Medal className="h-6 w-6 text-gray-600" />;
      case 3: return <Award className="h-6 w-6 text-amber-700" />;
      default: return null;
    }
  };

  // Sort contenders for podium order: 2nd, 1st, 3rd (left to right)
  const podiumOrder = [
    contenders.find(c => c.position === 2),
    contenders.find(c => c.position === 1),
    contenders.find(c => c.position === 3),
  ].filter(Boolean) as PodiumContender[];

  return (
    <Card className="overflow-hidden border-2 border-purple-200 shadow-xl bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-yellow-950/20">
      <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sparkles via-transparent to-sparkles opacity-30"></div>
        <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3 relative z-10">
          <Sparkles className="h-8 w-8 text-purple-600 animate-pulse" />
          🎉 Podium of the Month
          <Sparkles className="h-8 w-8 text-purple-600 animate-pulse" />
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          January 2025 Champions
        </p>
      </CardHeader>
      
      <CardContent className="p-8">
        <div className="flex justify-center items-end gap-6 max-w-4xl mx-auto">
          {podiumOrder.map((contender, index) => {
            const actualPosition = contender.position;
            const isGold = actualPosition === 1;
            const animationDelay = index * 200; // Stagger animations
            
            return (
              <div 
                key={contender.id} 
                className="flex flex-col items-center relative"
                style={{ 
                  animation: `podiumSlideUp 0.8s ease-out ${animationDelay}ms both, podiumGlow 2s ease-in-out infinite ${animationDelay + 800}ms` 
                }}
              >
                {/* Floating Medal/Crown */}
                <div className={cn(
                  "absolute -top-4 left-1/2 transform -translate-x-1/2 z-20",
                  isGold && "animate-bounce"
                )}>
                  {getMedalIcon(actualPosition)}
                </div>

                {/* Avatar with Progress Ring */}
                <div className={cn(
                  "mb-4 relative z-10 transform transition-all duration-300 hover:scale-110",
                  isGold && "animate-pulse"
                )}>
                  <ProgressAvatar 
                    avatar={contender.avatar}
                    nickname=""
                    weeklyProgress={contender.weeklyProgress}
                    dailyStreak={contender.dailyStreak}
                    weeklyStreak={Math.floor(contender.dailyStreak / 7)}
                    size={isGold ? "lg" : "md"}
                    showStats={false}
                  />
                  
                  {/* Sparkle Effects for Gold */}
                  {isGold && (
                    <>
                      <div className="absolute -top-2 -right-2 text-yellow-400 animate-ping">✨</div>
                      <div className="absolute -bottom-2 -left-2 text-yellow-400 animate-ping" style={{ animationDelay: '0.5s' }}>✨</div>
                    </>
                  )}
                </div>

                {/* Podium Base */}
                <div className={cn(
                  "w-24 rounded-t-lg border-2 flex items-center justify-center relative overflow-hidden",
                  getPodiumHeight(actualPosition),
                  getPodiumColor(actualPosition),
                  "shadow-lg transform transition-all duration-300 hover:shadow-xl"
                )}>
                  {/* Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full animate-shimmer"></div>
                  
                  <div className="text-center relative z-10">
                    <div className="text-3xl font-bold text-white drop-shadow-md">
                      {actualPosition}
                    </div>
                    <div className="text-xs font-semibold text-white/90">
                      {actualPosition === 1 ? 'GOLD' : actualPosition === 2 ? 'SILVER' : 'BRONZE'}
                    </div>
                  </div>
                </div>

                {/* User Info */}
                <div className="mt-4 text-center">
                  <div className="font-bold text-lg mb-1">{contender.nickname}</div>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "text-xs font-semibold",
                      isGold && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                    )}
                  >
                    {contender.score.toLocaleString()} pts
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {contender.weeklyProgress}% completion
                  </div>
                </div>

                {/* Confetti Effect for Gold */}
                {isGold && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 text-yellow-400 animate-bounce" style={{ animationDelay: '1s' }}>🎊</div>
                    <div className="absolute top-4 right-1/4 text-pink-400 animate-bounce" style={{ animationDelay: '1.5s' }}>🎉</div>
                    <div className="absolute bottom-8 left-1/3 text-blue-400 animate-bounce" style={{ animationDelay: '2s' }}>⭐</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Achievement Summary */}
        <div className="mt-8 text-center bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 backdrop-blur-sm">
          <h3 className="font-semibold text-lg mb-2">🏆 Achievement Unlocked</h3>
          <p className="text-sm text-muted-foreground">
            These champions dominated January 2025 with consistency, dedication, and incredible healthy habits!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};