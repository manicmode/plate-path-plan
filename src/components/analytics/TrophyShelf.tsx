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
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl border border-yellow-400/30 p-4">
        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="text-xl animate-pulse">🏅</div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-orange-400 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">
              Personal Accolades
            </h3>
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-400/30 text-xs">
              {trophies.length} Earned
            </Badge>
          </div>
          
          <div className="flex gap-1">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className={`h-7 px-3 text-xs ${filter === 'all' ? 'bg-yellow-500 hover:bg-yellow-600' : 'border-yellow-400/50 text-yellow-300 hover:bg-yellow-400/10'}`}
            >
              All
            </Button>
            <Button
              variant={filter === 'recent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('recent')}
              className={`h-7 px-3 text-xs ${filter === 'recent' ? 'bg-yellow-500 hover:bg-yellow-600' : 'border-yellow-400/50 text-yellow-300 hover:bg-yellow-400/10'}`}
            >
              Recent
            </Button>
            <Button
              variant={filter === 'rare' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('rare')}
              className={`h-7 px-3 text-xs ${filter === 'rare' ? 'bg-yellow-500 hover:bg-yellow-600' : 'border-yellow-400/50 text-yellow-300 hover:bg-yellow-400/10'}`}
            >
              Rare
            </Button>
          </div>
        </div>
        
        {/* Content Area */}
        <div>
          {filteredTrophies.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3 opacity-50">🏆</div>
              <h3 className="font-medium mb-2 text-yellow-200">
                {filter === 'all' ? 'No trophies yet' : `No ${filter} trophies`}
              </h3>
              <p className="text-sm text-yellow-300/60">
                {filter === 'all' 
                  ? 'Complete challenges and maintain streaks to earn your first trophy!'
                  : `Complete more challenges to earn ${filter} trophies!`
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
                {filteredTrophies.map((trophy, index) => {
                  const rarity = getRarityBadge(trophy.rarity);
                  return (
                    <div
                      key={`${trophy.name}-${index}`}
                      className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl bg-gradient-to-br ${getRarityColor(trophy.rarity)} border-2 rounded-lg p-3 text-center`}
                      onClick={() => setSelectedTrophy(trophy)}
                    >
                      <div className="text-2xl mb-2 animate-pulse">
                        {trophy.icon}
                      </div>
                      <h4 className="font-medium text-xs text-white mb-1 truncate">
                        {trophy.title}
                      </h4>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${rarity.className} mb-1`}
                      >
                        {rarity.text}
                      </Badge>
                      <div className="text-xs text-white/70">
                        {new Date(trophy.unlockedAt).toLocaleDateString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          
          {/* Compact Trophy Summary */}
          {trophies.length > 0 && (
            <div className="mt-4 pt-3 border-t border-yellow-400/30">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-yellow-400">
                    {trophies.filter(t => t.rarity === 'legendary').length}
                  </div>
                  <div className="text-xs text-yellow-300/60">Legendary</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-purple-400">
                    {trophies.filter(t => t.rarity === 'epic').length}
                  </div>
                  <div className="text-xs text-purple-300/60">Epic</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-blue-400">
                    {trophies.filter(t => t.rarity === 'rare').length}
                  </div>
                  <div className="text-xs text-blue-300/60">Rare</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

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