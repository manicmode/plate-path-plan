import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFriendTagging } from '@/hooks/useFriendTagging';
import { SmartFriendSelector } from './SmartFriendSelector';

interface Friend {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface FriendSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFriend: (friend: Friend) => void;
  searchQuery: string;
  position: { top: number; left: number };
  useSmartRecommendations?: boolean;
  maxResults?: number;
  excludeUserIds?: string[];
}

export const FriendSelector = ({ 
  isOpen, 
  onClose, 
  onSelectFriend, 
  searchQuery,
  position,
  useSmartRecommendations = false,
  maxResults = 5,
  excludeUserIds = []
}: FriendSelectorProps) => {
  const { searchFriends, isLoading } = useFriendTagging(false); // Use legacy mode when smart is disabled
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Use SmartFriendSelector when smart recommendations are enabled
  if (useSmartRecommendations) {
    return (
      <SmartFriendSelector
        isOpen={isOpen}
        onClose={onClose}
        onSelectFriend={(smartFriend) => onSelectFriend({
          id: smartFriend.id,
          name: smartFriend.name,
          email: smartFriend.email,
          phone: smartFriend.phone
        })}
        searchQuery={searchQuery}
        position={position}
        maxResults={maxResults}
        excludeUserIds={excludeUserIds}
      />
    );
  }

  useEffect(() => {
    if (isOpen) {
      const friends = searchFriends(searchQuery);
      setFilteredFriends(friends.slice(0, 5)); // Limit to 5 suggestions
    }
  }, [isOpen, searchQuery, searchFriends]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Card 
      ref={selectorRef}
      className="absolute z-50 w-64 max-h-60 overflow-y-auto shadow-lg"
      style={{ 
        top: position.top, 
        left: position.left,
        transform: 'translateY(-100%)' 
      }}
    >
      <CardContent className="p-2">
        {isLoading ? (
          <div className="p-2 text-sm text-muted-foreground">
            Loading friends...
          </div>
        ) : filteredFriends.length > 0 ? (
          <div className="space-y-1">
            {filteredFriends.map((friend) => (
              <Button
                key={friend.id}
                variant="ghost"
                className="w-full justify-start p-2 h-auto"
                onClick={() => {
                  onSelectFriend(friend);
                  onClose();
                }}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {friend.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="text-sm font-medium">{friend.name}</div>
                    {friend.email && (
                      <div className="text-xs text-muted-foreground">
                        {friend.email}
                      </div>
                    )}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        ) : (
          <div className="p-2 text-sm text-muted-foreground">
            {searchQuery ? 'No friends found' : 'No friends to tag'}
          </div>
        )}
      </CardContent>
    </Card>
  );
};