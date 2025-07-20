import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trophy, Star, Medal, Award, Calendar, Target, Zap } from 'lucide-react';
import { useBadges } from '@/contexts/BadgeContext';

interface TrophyDetail {
  name: string;
  title: string;
  description: string;
  icon: string;
  rarity: string;
  unlockedAt: string;
  challengeName?: string;
  rank?: number;
  achievementType: string;
}

export const TrophyShelf: React.FC = () => {
  const { badges, userBadges, userStreaks, loading } = useBadges();
  const [selectedTrophy, setSelectedTrophy] = useState<TrophyDetail | null>(null);
  const [filter, setFilter] = useState<'all' | 'recent' | 'rare'>('all');

  // Convert user badges to trophy details
  const trophies: TrophyDetail[] = userBadges.map(userBadge => {
    const badge = badges.find(b => b.id === userBadge.badge_id);
    return {
      name: badge?.name || 'unknown',
      title: badge?.title || 'Achievement',
      description: badge?.description || 'Great achievement!',
      icon: badge?.icon || '🏆',
      rarity: badge?.rarity || 'common',
      unlockedAt: userBadge.unlocked_at,
      challengeName: `${badge?.tracker_type} Challenge`,
      rank: 1, // Could be enhanced with actual rank data
      achievementType: badge?.requirement_type || 'general'
    };
  });

  // Filter trophies
  const filteredTrophies = trophies.filter(trophy => {
    const now = new Date();
    const unlockedDate = new Date(trophy.unlockedAt);
    const daysAgo = (now.getTime() - unlockedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    switch (filter) {
      case 'recent':
        return daysAgo <= 30; // Last 30 days
      case 'rare':
        return trophy.rarity === 'legendary' || trophy.rarity === 'epic';
      default:
        return true;
    }
  });

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return 'from-yellow-400 to-orange-500 border-yellow-400';
      case 'epic': return 'from-purple-400 to-pink-500 border-purple-400';
      case 'rare': return 'from-blue-400 to-cyan-500 border-blue-400';
      default: return 'from-gray-400 to-gray-500 border-gray-400';
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'legendary': return { text: 'Legendary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
      case 'epic': return { text: 'Epic', className: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'rare': return { text: 'Rare', className: 'bg-blue-100 text-blue-800 border-blue-200' };
      default: return { text: 'Common', className: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'streak': return <Zap className="h-4 w-4 text-orange-500" />;
      case 'count': return <Target className="h-4 w-4 text-blue-500" />;
      default: return <Star className="h-4 w-4 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading your trophy collection...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="text-2xl">🏅</div>
              <CardTitle className="text-lg">My Trophy Shelf</CardTitle>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                {trophies.length} Earned
              </Badge>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'recent' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('recent')}
              >
                Recent
              </Button>
              <Button
                variant={filter === 'rare' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('rare')}
              >
                Rare
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredTrophies.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4 opacity-30">🏆</div>
              <h3 className="font-medium mb-2">
                {filter === 'all' ? 'No trophies yet' : `No ${filter} trophies`}
              </h3>
              <p className="text-sm text-muted-foreground">
                {filter === 'all' 
                  ? 'Complete challenges and maintain streaks to earn your first trophy!'
                  : `Complete more challenges to earn ${filter} trophies!`
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-1">
                {filteredTrophies.map((trophy, index) => {
                  const rarity = getRarityBadge(trophy.rarity);
                  return (
                    <Card
                      key={`${trophy.name}-${index}`}
                      className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg bg-gradient-to-br ${getRarityColor(trophy.rarity)} border-2`}
                      onClick={() => setSelectedTrophy(trophy)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2 animate-pulse">
                          {trophy.icon}
                        </div>
                        <h4 className="font-medium text-sm text-white mb-1 truncate">
                          {trophy.title}
                        </h4>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${rarity.className}`}
                        >
                          {rarity.text}
                        </Badge>
                        <div className="mt-2 text-xs text-white/80">
                          {new Date(trophy.unlockedAt).toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          
          {/* Trophy Summary */}
          {trophies.length > 0 && (
            <div className="mt-4 pt-4 border-t border-yellow-200/50">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {trophies.filter(t => t.rarity === 'legendary').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Legendary</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {trophies.filter(t => t.rarity === 'epic').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Epic</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {trophies.filter(t => t.rarity === 'rare').length}
                  </div>
                  <div className="text-xs text-muted-foreground">Rare</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trophy Detail Modal */}
      {selectedTrophy && (
        <Dialog open={!!selectedTrophy} onOpenChange={() => setSelectedTrophy(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="text-4xl">{selectedTrophy.icon}</div>
                <div>
                  <h3 className="text-lg font-bold">{selectedTrophy.title}</h3>
                  <Badge 
                    variant="secondary" 
                    className={getRarityBadge(selectedTrophy.rarity).className}
                  >
                    {getRarityBadge(selectedTrophy.rarity).text}
                  </Badge>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-muted-foreground">
                {selectedTrophy.description}
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {getAchievementIcon(selectedTrophy.achievementType)}
                  <span className="text-sm">
                    <strong>Challenge:</strong> {selectedTrophy.challengeName}
                  </span>
                </div>
                
                {selectedTrophy.rank && (
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">
                      <strong>Rank:</strong> #{selectedTrophy.rank}
                    </span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">
                    <strong>Unlocked:</strong> {new Date(selectedTrophy.unlockedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setSelectedTrophy(null)}
                >
                  Close
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    // Could add share functionality here
                    setSelectedTrophy(null);
                  }}
                >
                  🎉 Celebrate
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};