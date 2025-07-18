import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Star, Flame, TrendingUp, Award, Zap } from 'lucide-react';
import { useBadges } from '@/contexts/BadgeContext';
import { BadgeCarousel } from './BadgeCarousel';
import { BadgeUnlockAnimation } from './BadgeUnlockAnimation';
import { cn } from '@/lib/utils';

export function StreakBadgesSection() {
  const { userBadges, userStreaks, loading } = useBadges();
  const [showBadgeCarousel, setShowBadgeCarousel] = useState(false);
  const [showUnlockAnimation, setShowUnlockAnimation] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Loading Badges...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-16 h-16 bg-muted rounded-full animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentBadges = userBadges.slice(0, 3);
  const selectedTitle = userStreaks?.selected_badge_title;

  return (
    <>
      <Card className="overflow-hidden border-2 border-yellow-200 dark:border-yellow-800 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold flex items-center gap-3">
              <Trophy className="h-6 w-6 text-yellow-500" />
              🏅 Badges & Achievements
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                {userBadges.length} Earned
              </Badge>
            </CardTitle>
            
            <Button 
              onClick={() => setShowBadgeCarousel(true)}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Award className="h-4 w-4" />
              View All
            </Button>
          </div>
          
          {selectedTitle && (
            <div className="flex items-center gap-2 mt-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">
                Current Title: <span className="font-medium text-primary">{selectedTitle}</span>
              </span>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Current Streaks Display */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Flame className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">Nutrition</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">{userStreaks?.current_nutrition_streak || 0}</div>
              <div className="text-xs text-blue-500">day streak</div>
            </div>
            
            <div className="text-center p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Flame className="h-4 w-4 text-cyan-500" />
                <span className="text-sm font-medium text-cyan-700 dark:text-cyan-400">Hydration</span>
              </div>
              <div className="text-2xl font-bold text-cyan-600">{userStreaks?.current_hydration_streak || 0}</div>
              <div className="text-xs text-cyan-500">day streak</div>
            </div>
            
            <div className="text-center p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Flame className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-400">Supplements</span>
              </div>
              <div className="text-2xl font-bold text-purple-600">{userStreaks?.current_supplement_streak || 0}</div>
              <div className="text-xs text-purple-500">day streak</div>
            </div>
          </div>

          {/* Recent Badges */}
          {recentBadges.length > 0 ? (
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Recent Achievements
              </h3>
              
              <ScrollArea className="h-32">
                <div className="space-y-3">
                  {recentBadges.map((userBadge) => {
                    const badge = userBadge.badge;
                    if (!badge) return null;
                    
                    return (
                      <div 
                        key={userBadge.id} 
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-xl",
                          badge.rarity === 'legendary' && "bg-gradient-to-br from-yellow-400 to-orange-500",
                          badge.rarity === 'rare' && "bg-gradient-to-br from-purple-400 to-purple-600",
                          badge.rarity === 'common' && "bg-gradient-to-br from-blue-400 to-blue-600"
                        )}>
                          {badge.icon}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{badge.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {badge.description}
                          </div>
                        </div>
                        
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-xs",
                            badge.rarity === 'legendary' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
                            badge.rarity === 'rare' && "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
                            badge.rarity === 'common' && "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                          )}
                        >
                          {badge.rarity}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-2">No Badges Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Keep logging your meals, hydration, and supplements to earn your first badge!
              </p>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" />
                <span>Start a 7-day streak to unlock your first badge!</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Badge Carousel Modal */}
      <BadgeCarousel
        open={showBadgeCarousel}
        onOpenChange={setShowBadgeCarousel}
      />

      {/* Badge Unlock Animation */}
      <BadgeUnlockAnimation
        badge={selectedBadge}
        open={showUnlockAnimation}
        onOpenChange={setShowUnlockAnimation}
      />
    </>
  );
}