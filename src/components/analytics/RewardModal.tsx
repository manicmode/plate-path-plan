import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Trophy, Zap, Heart } from 'lucide-react';
import { type Reward } from '@/contexts/RewardsContext';
import { cn } from '@/lib/utils';

interface RewardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reward: Reward | null;
}

export function RewardModal({ open, onOpenChange, reward }: RewardModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (open && reward) {
      // Show confetti animation
      setShowConfetti(true);
      
      // Show content after brief delay
      setTimeout(() => {
        setShowContent(true);
      }, 300);
      
      // Hide confetti after animation
      setTimeout(() => {
        setShowConfetti(false);
      }, 2000);
    } else {
      setShowConfetti(false);
      setShowContent(false);
    }
  }, [open, reward]);

  if (!reward) return null;

  const getRarityColor = (rarity: Reward['rarity']) => {
    switch (rarity) {
      case 'common': return 'from-blue-400 to-blue-600';
      case 'rare': return 'from-purple-400 to-purple-600';
      case 'legendary': return 'from-yellow-400 to-orange-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getRarityBadgeColor = (rarity: Reward['rarity']) => {
    switch (rarity) {
      case 'common': return 'bg-blue-500 text-white';
      case 'rare': return 'bg-purple-500 text-white';
      case 'legendary': return 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTypeIcon = (type: Reward['type']) => {
    switch (type) {
      case 'motivation': return Heart;
      case 'badge': return Trophy;
      case 'streak_booster': return Zap;
      default: return Sparkles;
    }
  };

  const TypeIcon = getTypeIcon(reward.type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-0 bg-transparent shadow-none p-0">
        <div className="relative">
          {/* Confetti Animation */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none z-10">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute w-2 h-2 rounded-full animate-confetti",
                    i % 4 === 0 ? "bg-yellow-400" :
                    i % 4 === 1 ? "bg-purple-500" :
                    i % 4 === 2 ? "bg-pink-500" : "bg-blue-500"
                  )}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 1000}ms`,
                    animationDuration: `${1500 + Math.random() * 1000}ms`
                  }}
                />
              ))}
            </div>
          )}

          {/* Main Content */}
          <div 
            className={cn(
              "bg-background rounded-2xl border-4 p-8 text-center transition-all duration-500",
              `border-gradient-to-r ${getRarityColor(reward.rarity)}`,
              showContent ? "opacity-100 scale-100" : "opacity-0 scale-95"
            )}
            style={{
              background: `linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)`,
              borderImage: `linear-gradient(135deg, var(--${reward.rarity === 'legendary' ? 'yellow-400' : reward.rarity === 'rare' ? 'purple-400' : 'blue-400'}), var(--${reward.rarity === 'legendary' ? 'orange-500' : reward.rarity === 'rare' ? 'purple-600' : 'blue-600'})) 1`
            }}
          >
            {/* Rarity Badge */}
            <Badge 
              className={cn(
                "absolute -top-3 left-1/2 transform -translate-x-1/2 text-xs font-bold",
                getRarityBadgeColor(reward.rarity)
              )}
            >
              {reward.rarity.toUpperCase()}
            </Badge>

            {/* Icon and Emoji */}
            <div className="relative mb-6">
              <div className={cn(
                "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4",
                `bg-gradient-to-br ${getRarityColor(reward.rarity)}`,
                "animate-pulse shadow-lg"
              )}>
                <span className="text-4xl">{reward.emoji}</span>
              </div>
              
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <TypeIcon className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {reward.title}
            </h2>

            {/* Description */}
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {reward.description}
            </p>

            {/* Action based on type */}
            {reward.type === 'streak_booster' && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4 mb-6 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                  <Zap className="h-5 w-5" />
                  <span className="font-semibold">Boost Activated!</span>
                </div>
              </div>
            )}

            {reward.type === 'badge' && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg p-4 mb-6 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-center gap-2 text-purple-700 dark:text-purple-400">
                  <Trophy className="h-5 w-5" />
                  <span className="font-semibold">Badge Earned!</span>
                </div>
              </div>
            )}

            {/* Next Box Info */}
            <div className="text-sm text-muted-foreground mb-6 p-3 bg-muted/50 rounded-lg">
              <Sparkles className="h-4 w-4 inline mr-2" />
              Come back next week for another surprise!
            </div>

            {/* Close Button */}
            <Button 
              onClick={() => onOpenChange(false)}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
              size="lg"
            >
              Amazing! 🎉
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}