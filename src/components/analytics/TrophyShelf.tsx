import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Trophy, Star, Medal, Award, Calendar, Target, Zap, ChevronDown, Filter } from 'lucide-react';
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
  category: 'public' | 'private' | 'quick';
}

type CategoryFilter = 'public' | 'private' | 'quick';

export const TrophyShelf: React.FC = () => {
  const { badges, userBadges, userStreaks, loading } = useBadges();
  const [selectedTrophy, setSelectedTrophy] = useState<TrophyDetail | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter | null>(null);

  // Convert user badges to trophy details with categories
  const trophies: TrophyDetail[] = userBadges.map(userBadge => {
    const badge = badges.find(b => b.id === userBadge.badge_id);
    // Determine category based on badge type (mock logic - replace with actual categorization)
    const category: CategoryFilter = badge?.tracker_type === 'hydration' ? 'public' : 
                                   badge?.tracker_type === 'calories' ? 'private' : 'quick';
    
    return {
      name: badge?.name || 'unknown',
      title: badge?.title || 'Achievement',
      description: badge?.description || 'Great achievement!',
      icon: badge?.icon || '🏆',
      rarity: badge?.rarity || 'common',
      unlockedAt: userBadge.unlocked_at,
      challengeName: `${badge?.tracker_type} Challenge`,
      rank: 1, // Could be enhanced with actual rank data
      achievementType: badge?.requirement_type || 'general',
      category: category
    };
  });

  // Determine which categories have awards and set initial selection
  useEffect(() => {
    if (trophies.length > 0 && selectedCategory === null) {
      const categoriesWithAwards = {
        public: trophies.filter(t => t.category === 'public').length > 0,
        private: trophies.filter(t => t.category === 'private').length > 0,
        quick: trophies.filter(t => t.category === 'quick').length > 0
      };

      // Apply hierarchy: public > private > quick
      if (categoriesWithAwards.public) {
        setSelectedCategory('public');
      } else if (categoriesWithAwards.private) {
        setSelectedCategory('private');
      } else if (categoriesWithAwards.quick) {
        setSelectedCategory('quick');
      }
    }
  }, [trophies, selectedCategory]);

  // Filter trophies by category and sort by most recent first
  const filteredTrophies = trophies
    .filter(trophy => selectedCategory ? trophy.category === selectedCategory : true)
    .sort((a, b) => new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime());

  // Get available categories with counts
  const availableCategories = [
    { key: 'public' as CategoryFilter, label: 'Public Challenges', count: trophies.filter(t => t.category === 'public').length },
    { key: 'private' as CategoryFilter, label: 'Private Challenges', count: trophies.filter(t => t.category === 'private').length },
    { key: 'quick' as CategoryFilter, label: 'Quick Challenges', count: trophies.filter(t => t.category === 'quick').length }
  ].filter(cat => cat.count > 0);

  const getCurrentCategoryLabel = () => {
    const category = availableCategories.find(cat => cat.key === selectedCategory);
    return category ? category.label : 'Select Category';
  };

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
        {/* Header with Dropdown */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="text-xl animate-pulse">🏅</div>
            <h3 className="text-lg font-bold bg-gradient-to-r from-orange-400 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">
              Personal Accolades
            </h3>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 px-4 py-2 text-xs rounded-full border-yellow-400/50 text-yellow-300 hover:bg-yellow-400/10 min-w-[140px] justify-between"
              >
                <div className="flex items-center gap-1">
                  <Filter className="h-3 w-3" />
                  <span>{getCurrentCategoryLabel()}</span>
                </div>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {availableCategories.map((category) => (
                <DropdownMenuItem
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  className="flex items-center justify-between"
                >
                  <span>{category.label}</span>
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {category.count}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Content Area */}
        <div>
          {filteredTrophies.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3 opacity-50">🏆</div>
              <h3 className="font-medium mb-2 text-yellow-200">
                {selectedCategory ? `No ${getCurrentCategoryLabel()} trophies yet` : 'No trophies yet'}
              </h3>
              <p className="text-sm text-yellow-300/60">
                {selectedCategory 
                  ? `Complete more ${getCurrentCategoryLabel().toLowerCase()} to earn trophies!`
                  : 'Complete challenges and maintain streaks to earn your first trophy!'
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