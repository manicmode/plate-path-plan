import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/dialog';
import AccessibleDialogContent from '@/components/a11y/AccessibleDialogContent';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Star, Crown, Sparkles, Share2 } from 'lucide-react';
import { type Badge as BadgeType } from '@/contexts/BadgeContext';
import { cn } from '@/lib/utils';
import { ShareComposer } from '@/components/share/ShareComposer';

interface BadgeUnlockAnimationProps {
  badge: BadgeType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BadgeUnlockAnimation({ badge, open, onOpenChange }: BadgeUnlockAnimationProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [animationStage, setAnimationStage] = useState<'enter' | 'celebration' | 'exit'>('enter');
  const [isShareOpen, setIsShareOpen] = useState(false);

  useEffect(() => {
    if (open && badge) {
      setAnimationStage('enter');
      setShowConfetti(true);
      
      // Celebration stage
      setTimeout(() => {
        setAnimationStage('celebration');
      }, 500);
      
      // Hide confetti
      setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
    } else {
      setShowConfetti(false);
      setAnimationStage('enter');
    }
  }, [open, badge]);

  if (!badge) return null;

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'from-blue-400 to-blue-600';
      case 'rare': return 'from-purple-400 to-purple-600';
      case 'legendary': return 'from-yellow-400 to-orange-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const getRarityIcon = (rarity: string) => {
    switch (rarity) {
      case 'common': return Star;
      case 'rare': return Trophy;
      case 'legendary': return Crown;
      default: return Star;
    }
  };

  const RarityIcon = getRarityIcon(badge.rarity);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <AccessibleDialogContent 
        title="Badge Unlocked!"
        description={`You've earned the ${badge.title} badge!`}
        className="max-w-md border-0 bg-transparent shadow-none p-0"
      >
        <div className="relative">
          {/* Confetti Animation */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "absolute w-3 h-3 animate-confetti",
                    i % 5 === 0 ? "bg-yellow-400" :
                    i % 5 === 1 ? "bg-purple-500" :
                    i % 5 === 2 ? "bg-pink-500" :
                    i % 5 === 3 ? "bg-blue-500" : "bg-green-500",
                    i % 3 === 0 ? "rounded-full" :
                    i % 3 === 1 ? "rounded-sm" : "rounded"
                  )}
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 1000}ms`,
                    animationDuration: `${2000 + Math.random() * 1000}ms`
                  }}
                />
              ))}
            </div>
          )}

          {/* Main Content */}
          <div 
            className={cn(
              "bg-background rounded-3xl border-4 p-8 text-center transition-all duration-1000 relative overflow-hidden",
              animationStage === 'enter' && "opacity-0 scale-50 rotate-12",
              animationStage === 'celebration' && "opacity-100 scale-100 rotate-0",
              animationStage === 'exit' && "opacity-0 scale-95"
            )}
            style={{
              background: `linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--background)) 100%)`,
              borderImage: `linear-gradient(135deg, ${badge.rarity === 'legendary' ? '#facc15, #f97316' : badge.rarity === 'rare' ? '#a855f7, #7c3aed' : '#3b82f6, #1d4ed8'}) 1`
            }}
          >
            {/* Sparkle Effects */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <Sparkles
                  key={i}
                  className={cn(
                    "absolute text-yellow-400 animate-ping",
                    `w-${3 + (i % 3)} h-${3 + (i % 3)}`
                  )}
                  style={{
                    left: `${10 + (i * 12)}%`,
                    top: `${10 + ((i * 7) % 80)}%`,
                    animationDelay: `${i * 200}ms`,
                    animationDuration: '2s'
                  }}
                />
              ))}
            </div>

            {/* Rarity Badge */}
            <Badge 
              className={cn(
                "absolute -top-3 left-1/2 transform -translate-x-1/2 text-sm font-bold px-4 py-1",
                badge.rarity === 'common' && "bg-blue-500 text-white",
                badge.rarity === 'rare' && "bg-purple-500 text-white",
                badge.rarity === 'legendary' && "bg-gradient-to-r from-yellow-400 to-orange-500 text-white"
              )}
            >
              <RarityIcon className="h-4 w-4 mr-1" />
              {badge.rarity.toUpperCase()}
            </Badge>

            {/* Achievement Text */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
                BADGE UNLOCKED!
              </h1>
              <div className="flex items-center justify-center gap-2 text-lg text-muted-foreground">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span>Achievement Complete</span>
                <Trophy className="h-5 w-5 text-yellow-500" />
              </div>
            </div>

            {/* Badge Display */}
            <div 
              className={cn(
                "relative mb-6 transition-all duration-1000",
                animationStage === 'celebration' && "animate-bounce"
              )}
            >
              <div 
                className={cn(
                  "w-32 h-32 mx-auto rounded-full flex items-center justify-center text-6xl shadow-2xl",
                  `bg-gradient-to-br ${getRarityColor(badge.rarity)}`,
                  animationStage === 'celebration' && "animate-pulse"
                )}
                style={{
                  boxShadow: `0 0 40px ${badge.rarity === 'legendary' ? '#fbbf24' : badge.rarity === 'rare' ? '#a855f7' : '#3b82f6'}50`
                }}
              >
                {badge.icon}
              </div>
              
              {/* Glow Ring */}
              <div 
                className={cn(
                  "absolute inset-0 rounded-full border-4 animate-ping",
                  badge.rarity === 'legendary' ? "border-yellow-400" :
                  badge.rarity === 'rare' ? "border-purple-400" :
                  "border-blue-400"
                )}
                style={{ animationDuration: '2s' }}
              />
            </div>

            {/* Badge Info */}
            <div className="space-y-3 mb-6">
              <h2 className="text-2xl font-bold">{badge.title}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {badge.description}
              </p>
            </div>

            {/* Motivational Message */}
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4 mb-6 border border-green-200 dark:border-green-800 shadow-lg">
              <p className="text-green-700 dark:text-green-400 font-medium">
                🎉 Amazing work! Your dedication is paying off!
              </p>
            </div>

            {/* Share + Close Buttons */}
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => setIsShareOpen(true)} className="flex items-center gap-2">
                <Share2 className="h-4 w-4" /> Share
              </Button>
              <Button 
                onClick={() => onOpenChange(false)}
                className="flex-1 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                size="lg"
              >
                Continue Your Journey! 🚀
              </Button>
            </div>
          </div>
        </div>
      </AccessibleDialogContent>
      <ShareComposer 
        open={isShareOpen} 
        onOpenChange={setIsShareOpen}
        type="win"
        initialTemplate="win_basic"
        payload={{
          title: badge.title,
          subtitle: badge.description,
          statBlocks: [{ label: 'Rarity', value: badge.rarity }],
          emojiOrIcon: '🏅',
          date: new Date().toLocaleDateString(),
          theme: 'dark'
        }}
      />
    </Dialog>
  );
}