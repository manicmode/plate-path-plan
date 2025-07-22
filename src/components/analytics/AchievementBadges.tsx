import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Flame, 
  Target, 
  Star, 
  Award, 
  Crown, 
  Zap, 
  Heart,
  TrendingUp,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: 'score' | 'streak' | 'consistency' | 'improvement';
}

interface AchievementBadgesProps {
  scoreStats: {
    currentScore: number;
    weeklyAverage: number;
    monthlyAverage: number;
    streak: number;
    bestScore: number;
  };
  className?: string;
}

export const AchievementBadges: React.FC<AchievementBadgesProps> = ({ 
  scoreStats, 
  className 
}) => {
  console.count("AchievementBadges renders");
  
  // Render counter for infinite loop detection
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  console.log(`🔄 AchievementBadges render count: ${renderCountRef.current}`);
  const achievements: Achievement[] = [
    // Score-based achievements
    {
      id: 'perfectionist',
      name: 'Perfectionist',
      description: 'Achieve a perfect 100.0 score',
      icon: <Crown className="h-4 w-4" />,
      progress: scoreStats.bestScore,
      maxProgress: 100,
      unlocked: scoreStats.bestScore >= 100,
      rarity: 'legendary',
      category: 'score'
    },
    {
      id: 'excellence',
      name: 'Excellence',
      description: 'Score 95+ points in a day',
      icon: <Trophy className="h-4 w-4" />,
      progress: scoreStats.bestScore,
      maxProgress: 95,
      unlocked: scoreStats.bestScore >= 95,
      rarity: 'epic',
      category: 'score'
    },
    {
      id: 'great_day',
      name: 'Great Day',
      description: 'Score 90+ points in a day',
      icon: <Star className="h-4 w-4" />,
      progress: scoreStats.bestScore,
      maxProgress: 90,
      unlocked: scoreStats.bestScore >= 90,
      rarity: 'rare',
      category: 'score'
    },
    {
      id: 'solid_performance',
      name: 'Solid Performance',
      description: 'Score 80+ points in a day',
      icon: <Target className="h-4 w-4" />,
      progress: scoreStats.bestScore,
      maxProgress: 80,
      unlocked: scoreStats.bestScore >= 80,
      rarity: 'common',
      category: 'score'
    },

    // Streak achievements
    {
      id: 'fire_month',
      name: 'On Fire!',
      description: 'Maintain a 30-day streak',
      icon: <Flame className="h-4 w-4" />,
      progress: scoreStats.streak,
      maxProgress: 30,
      unlocked: scoreStats.streak >= 30,
      rarity: 'legendary',
      category: 'streak'
    },
    {
      id: 'dedicated',
      name: 'Dedicated',
      description: 'Maintain a 14-day streak',
      icon: <Zap className="h-4 w-4" />,
      progress: scoreStats.streak,
      maxProgress: 14,
      unlocked: scoreStats.streak >= 14,
      rarity: 'epic',
      category: 'streak'
    },
    {
      id: 'consistent',
      name: 'Consistent',
      description: 'Maintain a 7-day streak',
      icon: <Shield className="h-4 w-4" />,
      progress: scoreStats.streak,
      maxProgress: 7,
      unlocked: scoreStats.streak >= 7,
      rarity: 'rare',
      category: 'streak'
    },
    {
      id: 'getting_started',
      name: 'Getting Started',
      description: 'Maintain a 3-day streak',
      icon: <Heart className="h-4 w-4" />,
      progress: scoreStats.streak,
      maxProgress: 3,
      unlocked: scoreStats.streak >= 3,
      rarity: 'common',
      category: 'streak'
    },

    // Consistency achievements
    {
      id: 'weekly_champion',
      name: 'Weekly Champion',
      description: 'Average 85+ for the week',
      icon: <Award className="h-4 w-4" />,
      progress: scoreStats.weeklyAverage,
      maxProgress: 85,
      unlocked: scoreStats.weeklyAverage >= 85,
      rarity: 'epic',
      category: 'consistency'
    },
    {
      id: 'steady_progress',
      name: 'Steady Progress',
      description: 'Average 75+ for the week',
      icon: <TrendingUp className="h-4 w-4" />,
      progress: scoreStats.weeklyAverage,
      maxProgress: 75,
      unlocked: scoreStats.weeklyAverage >= 75,
      rarity: 'rare',
      category: 'consistency'
    }
  ];

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'legendary': return 'from-purple-500 to-pink-500';
      case 'epic': return 'from-blue-500 to-purple-500';
      case 'rare': return 'from-green-500 to-blue-500';
      case 'common': return 'from-gray-400 to-gray-600';
    }
  };

  const getRarityBorderColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'legendary': return 'border-purple-400';
      case 'epic': return 'border-blue-400';
      case 'rare': return 'border-green-400';
      case 'common': return 'border-gray-400';
    }
  };

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const lockedAchievements = achievements.filter(a => !a.unlocked);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Achievements
          <Badge variant="outline" className="ml-auto">
            {unlockedAchievements.length}/{achievements.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Unlocked Achievements */}
        {unlockedAchievements.length > 0 && (
          <div className="space-y-4 mb-6">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Unlocked ({unlockedAchievements.length})
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {unlockedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={cn(
                    "relative p-3 rounded-lg border-2 bg-gradient-to-br",
                    getRarityBorderColor(achievement.rarity),
                    getRarityColor(achievement.rarity),
                    "text-white shadow-lg"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {achievement.icon}
                    <Badge 
                      variant="secondary" 
                      className="text-xs bg-white/20 text-white border-white/30"
                    >
                      {achievement.rarity}
                    </Badge>
                  </div>
                  <h5 className="font-semibold text-sm">{achievement.name}</h5>
                  <p className="text-xs opacity-90 mt-1">{achievement.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Achievements */}
        {lockedAchievements.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              In Progress ({lockedAchievements.length})
            </h4>
            <div className="space-y-3">
              {lockedAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="p-3 rounded-lg border bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-muted-foreground">
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h5 className="font-semibold text-sm">{achievement.name}</h5>
                        <Badge variant="outline" className="text-xs">
                          {achievement.rarity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>
                        {achievement.progress.toFixed(1)}/{achievement.maxProgress}
                      </span>
                    </div>
                    <Progress 
                      value={(achievement.progress / achievement.maxProgress) * 100}
                      className="h-2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {unlockedAchievements.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Start logging your nutrition to unlock achievements!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};