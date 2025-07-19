import React, { useState, useEffect } from 'react';
import { Flame, UserPlus, Trophy, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useFriendSearch } from '@/hooks/useFriendSearch';

interface SuggestedFriend {
  friend_id: string;
  friend_name: string;
  friend_email: string;
  friend_phone: string;
  relevance_score: number;
  interaction_metadata: {
    chat_count: number;
    shared_challenges: number;
    is_following: boolean;
    is_followed_by: boolean;
    last_interaction: string;
    streak_similarity: 'high' | 'medium' | 'low';
    activity_status: 'recently_active' | 'active' | 'somewhat_active' | 'inactive';
  };
}

export const SuggestedFriends = () => {
  const [suggestedFriends, setSuggestedFriends] = useState<SuggestedFriend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { sendFriendRequest } = useFriendSearch();

  useEffect(() => {
    loadSuggestedFriends();
  }, []);

  const loadSuggestedFriends = async () => {
    try {
      const { data, error } = await supabase.rpc('get_smart_friend_recommendations', {
        current_user_id: (await supabase.auth.getUser()).data.user?.id
      });

      if (error) throw error;
      setSuggestedFriends((data || []).slice(0, 5) as SuggestedFriend[]); // Show top 5 suggestions
    } catch (error) {
      console.error('Error loading suggested friends:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    await sendFriendRequest(friendId);
    // Remove from suggestions after sending request
    setSuggestedFriends(prev => prev.filter(friend => friend.friend_id !== friendId));
  };

  const getActivityIcon = (status: string) => {
    switch (status) {
      case 'recently_active':
        return '🔥';
      case 'active':
        return '💪';
      case 'somewhat_active':
        return '⭐';
      default:
        return '😴';
    }
  };

  const getMutualChallengeText = (metadata: SuggestedFriend['interaction_metadata']) => {
    if (metadata.shared_challenges > 0) {
      return `You both completed ${metadata.shared_challenges} challenge${metadata.shared_challenges > 1 ? 's' : ''}`;
    }
    if (metadata.streak_similarity === 'high') {
      return "Similar wellness streaks";
    }
    if (metadata.chat_count > 0) {
      return `${metadata.chat_count} chat interactions`;
    }
    return "Recommended for you";
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestedFriends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Flame className="h-5 w-5 text-orange-500" />
            🔥 Suggested Friends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No friend suggestions available</p>
            <p className="text-xs mt-1">Complete challenges to find like-minded users</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Flame className="h-5 w-5 text-orange-500" />
          🔥 Suggested Friends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestedFriends.map((friend) => (
          <div 
            key={friend.friend_id}
            className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow bg-gradient-to-r from-background to-muted/20"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-lg">
                      {friend.friend_name?.charAt(0) || '👤'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-1 -right-1 text-sm">
                    {getActivityIcon(friend.interaction_metadata.activity_status)}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm truncate">
                      {friend.friend_name}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(friend.relevance_score)}% match
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    {friend.friend_email}
                  </p>
                  
                  <div className="flex items-center gap-1 text-xs text-primary">
                    {friend.interaction_metadata.shared_challenges > 0 ? (
                      <Trophy className="h-3 w-3" />
                    ) : (
                      <Target className="h-3 w-3" />
                    )}
                    <span>{getMutualChallengeText(friend.interaction_metadata)}</span>
                  </div>
                  
                  {/* Activity indicators */}
                  <div className="flex gap-1 mt-2">
                    {friend.interaction_metadata.is_following && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        Following you
                      </Badge>
                    )}
                    {friend.interaction_metadata.streak_similarity === 'high' && (
                      <Badge variant="secondary" className="text-xs px-1 py-0">
                        Similar streaks
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <Button
                size="sm"
                onClick={() => handleAddFriend(friend.friend_id)}
                className="ml-3 flex items-center gap-1 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90"
              >
                <UserPlus className="h-3 w-3" />
                Add Friend
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};