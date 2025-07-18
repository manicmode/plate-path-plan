import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MessageCircle, Trophy, Users, Zap } from 'lucide-react';
import { useSmartFriendRecommendations, SmartFriend } from '@/hooks/useSmartFriendRecommendations';

interface SmartFriendSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFriend: (friend: SmartFriend) => void;
  searchQuery?: string;
  position: { top: number; left: number };
  maxResults?: number;
  excludeUserIds?: string[];
  showMetadata?: boolean;
}

export function SmartFriendSelector({
  isOpen,
  onClose,
  onSelectFriend,
  searchQuery = '',
  position,
  maxResults = 5,
  excludeUserIds = [],
  showMetadata = true
}: SmartFriendSelectorProps) {
  const { friends, isLoading, searchRecommendations } = useSmartFriendRecommendations();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [filteredFriends, setFilteredFriends] = useState<SmartFriend[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    let results = searchQuery ? searchRecommendations(searchQuery) : friends;
    
    // Filter out excluded users
    if (excludeUserIds.length > 0) {
      results = results.filter(friend => !excludeUserIds.includes(friend.id));
    }
    
    // Apply max results limit
    results = results.slice(0, maxResults);
    
    setFilteredFriends(results);
  }, [friends, searchQuery, excludeUserIds, maxResults, isOpen, searchRecommendations]);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setLocalSearch(query);
    let results = searchRecommendations(query);
    
    if (excludeUserIds.length > 0) {
      results = results.filter(friend => !excludeUserIds.includes(friend.id));
    }
    
    results = results.slice(0, maxResults);
    setFilteredFriends(results);
  };

  const getRelevanceIcon = (score: number) => {
    if (score >= 80) return <Zap className="h-3 w-3 text-accent" />;
    if (score >= 60) return <Trophy className="h-3 w-3 text-primary" />;
    if (score >= 40) return <Users className="h-3 w-3 text-secondary" />;
    return <MessageCircle className="h-3 w-3 text-muted-foreground" />;
  };

  const getActivityBadge = (metadata: SmartFriend['metadata']) => {
    if (metadata.activityStatus === 'recently_active') {
      return <Badge variant="default" className="text-xs">🔥 Active</Badge>;
    }
    if (metadata.isFollowing) {
      return <Badge variant="secondary" className="text-xs">Following</Badge>;
    }
    if (metadata.sharedChallenges > 0) {
      return <Badge variant="outline" className="text-xs">🏆 {metadata.sharedChallenges} challenges</Badge>;
    }
    if (metadata.streakSimilarity === 'high') {
      return <Badge variant="outline" className="text-xs">⚡ Similar streaks</Badge>;
    }
    return null;
  };

  if (!isOpen) return null;

  return (
    <Card 
      className="absolute z-50 w-80 max-h-96 overflow-auto shadow-lg border"
      style={{ top: position.top, left: position.left }}
    >
      <CardContent className="p-2">
        <div className="flex items-center gap-2 p-2 border-b">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search smart recommendations..."
            className="border-0 p-0 h-auto focus-visible:ring-0"
            autoFocus
          />
        </div>
        
        {isLoading ? (
          <div className="p-4 text-center text-muted-foreground">Loading recommendations...</div>
        ) : filteredFriends.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchQuery ? 'No matching friends found' : 'No friends to recommend'}
          </div>
        ) : (
          <div className="space-y-1 py-2">
            {filteredFriends.map((friend) => (
              <Button
                key={friend.id}
                variant="ghost"
                className="w-full h-auto p-3 justify-start"
                onClick={() => {
                  onSelectFriend(friend);
                  onClose();
                }}
              >
                <div className="flex items-center gap-3 w-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {friend.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{friend.name}</span>
                      {getRelevanceIcon(friend.relevanceScore)}
                      <span className="text-xs text-muted-foreground">
                        {friend.relevanceScore}%
                      </span>
                    </div>
                    
                    {friend.email && (
                      <div className="text-xs text-muted-foreground truncate">
                        {friend.email}
                      </div>
                    )}
                    
                    {showMetadata && (
                      <div className="flex items-center gap-1 mt-1">
                        {getActivityBadge(friend.metadata)}
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        )}
        
        <div className="p-2 border-t text-xs text-muted-foreground">
          Ranked by interaction frequency, shared challenges & streaks
        </div>
      </CardContent>
    </Card>
  );
}