import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Crown, Sparkles, Lock, CheckCircle } from 'lucide-react';
import { useBadges, type Badge as BadgeType } from '@/contexts/BadgeContext';
import { cn } from '@/lib/utils';

interface BadgeCarouselProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BadgeCarousel({ open, onOpenChange }: BadgeCarouselProps) {
  const { badges, userBadges, userStreaks, getBadgeProgress, selectBadgeTitle } = useBadges();
  const [selectedTab, setSelectedTab] = useState<'all' | 'unlocked' | 'locked'>('all');

  const unlockedBadgeIds = userBadges.map(ub => ub.badge_id);
  
  const filteredBadges = badges.filter(badge => {
    if (selectedTab === 'unlocked') return unlockedBadgeIds.includes(badge.id);
    if (selectedTab === 'locked') return !unlockedBadgeIds.includes(badge.id);
    return true;
  });

  const handleSelectTitle = (badge: BadgeType) => {
    if (unlockedBadgeIds.includes(badge.id)) {
      selectBadgeTitle(badge.title);
    }
  };

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

  const getBadgeCountByRarity = (rarity: string) => {
    return userBadges.filter(ub => ub.badge?.rarity === rarity).length;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Badge Collection
            <Badge variant="secondary" className="ml-2">
              {userBadges.length} / {badges.length}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{getBadgeCountByRarity('common')}</div>
            <div className="text-sm text-blue-500">Common Badges</div>
          </div>
          <div className="text-center p-3 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{getBadgeCountByRarity('rare')}</div>
            <div className="text-sm text-purple-500">Rare Badges</div>
          </div>
          <div className="text-center p-3 bg-gradient-to-r from-yellow-50 to-orange-100 dark:from-yellow-950/20 dark:to-orange-900/20 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{getBadgeCountByRarity('legendary')}</div>
            <div className="text-sm text-yellow-500">Legendary Badges</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'all', label: 'All Badges', count: badges.length },
            { id: 'unlocked', label: 'Unlocked', count: userBadges.length },
            { id: 'locked', label: 'Locked', count: badges.length - userBadges.length },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={selectedTab === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTab(tab.id as any)}
              className="flex items-center gap-2"
            >
              {tab.label}
              <Badge variant="secondary" className="text-xs">
                {tab.count}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Badges Grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pr-4">
            {filteredBadges.map((badge) => {
              const isUnlocked = unlockedBadgeIds.includes(badge.id);
              const progress = getBadgeProgress(badge);
              const RarityIcon = getRarityIcon(badge.rarity);
              const isSelected = userStreaks?.selected_badge_title === badge.title;

              return (
                <TooltipProvider key={badge.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer",
                          isUnlocked 
                            ? "border-primary bg-primary/5 hover:bg-primary/10 hover:scale-105" 
                            : "border-muted bg-muted/30 hover:border-primary/50",
                          isSelected && "ring-2 ring-primary ring-opacity-50"
                        )}
                        onClick={() => handleSelectTitle(badge)}
                      >
                        {/* Rarity Badge */}
                        <div className="absolute -top-2 -right-2">
                          <Badge 
                            className={cn(
                              "text-xs font-bold",
                              badge.rarity === 'common' && "bg-blue-500",
                              badge.rarity === 'rare' && "bg-purple-500", 
                              badge.rarity === 'legendary' && "bg-gradient-to-r from-yellow-400 to-orange-500"
                            )}
                          >
                            <RarityIcon className="h-3 w-3 mr-1" />
                            {badge.rarity.toUpperCase()}
                          </Badge>
                        </div>

                        {/* Lock/Check Icon */}
                        <div className="absolute top-2 left-2">
                          {isUnlocked ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <Lock className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        {/* Selected Indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                          </div>
                        )}

                        {/* Badge Icon */}
                        <div className={cn(
                          "w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center text-3xl",
                          `bg-gradient-to-br ${getRarityColor(badge.rarity)}`,
                          !isUnlocked && "grayscale opacity-50"
                        )}>
                          {badge.icon}
                        </div>

                        {/* Badge Title */}
                        <h3 className={cn(
                          "font-bold text-center mb-1 text-sm",
                          !isUnlocked && "text-muted-foreground"
                        )}>
                          {badge.title}
                        </h3>

                        {/* Progress Bar for Locked Badges */}
                        {!isUnlocked && (
                          <div className="mt-2">
                            <Progress value={progress} className="h-2" />
                            <div className="text-xs text-center mt-1 text-muted-foreground">
                              {Math.round(progress)}%
                            </div>
                          </div>
                        )}

                        {/* Selected Badge Indicator */}
                        {isSelected && (
                          <div className="mt-2 text-center">
                            <Badge variant="default" className="text-xs">
                              Active Title
                            </Badge>
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <div className="space-y-2">
                        <div className="font-medium">{badge.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {badge.description}
                        </div>
                        {!isUnlocked && (
                          <div className="text-xs text-primary">
                            Progress: {Math.round(progress)}%
                          </div>
                        )}
                        {isUnlocked && (
                          <div className="text-xs text-green-500">
                            Click to {isSelected ? 'deselect' : 'select'} as title
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t pt-4 text-center text-sm text-muted-foreground">
          Earn badges by maintaining streaks and achieving goals! 
          {userStreaks?.selected_badge_title && (
            <div className="mt-2">
              <Badge variant="outline">
                Current Title: {userStreaks.selected_badge_title}
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}