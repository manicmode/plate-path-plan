import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFriendTagging } from '@/hooks/useFriendTagging';

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
}

export const FriendSelector = ({ 
  isOpen, 
  onClose, 
  onSelectFriend, 
  searchQuery,
  position 
}: FriendSelectorProps) => {
  const { searchFriends, isLoading } = useFriendTagging();
  const [filteredFriends, setFilteredFriends] = useState<Friend[]>([]);
  const selectorRef = useRef<HTMLDivElement>(null);

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
      className="absolute z-50 w-64 max-h-60 overflow-y-auto shadow-lg animate-fade-in"
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