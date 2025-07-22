
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface SmartFriend {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  relevanceScore: number;
  metadata: {
    chatCount: number;
    sharedChallenges: number;
    isFollowing: boolean;
    isFollowedBy: boolean;
    lastInteraction?: string;
    streakSimilarity: 'high' | 'medium' | 'low';
    activityStatus: 'recently_active' | 'active' | 'somewhat_active' | 'inactive';
  };
}

export const useSmartFriendRecommendations = (limit?: number) => {
  const [friends, setFriends] = useState<SmartFriend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const loadRecommendations = useCallback(async () => {
    if (!user) {
      setFriends([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_smart_friend_recommendations', { current_user_id: user.id });

      if (error) {
        console.error('Smart friend recommendations error:', error);
        setFriends([]);
        return;
      }

      const recommendations: SmartFriend[] = Array.isArray(data) ? data.map((friend: any) => {
        try {
          return {
            id: friend?.friend_id || '',
            name: friend?.friend_name || 'Unknown',
            email: friend?.friend_email || undefined,
            phone: friend?.friend_phone || undefined,
            relevanceScore: Number(friend?.relevance_score) || 0,
            metadata: {
              chatCount: Number(friend?.interaction_metadata?.chat_count) || 0,
              sharedChallenges: Number(friend?.interaction_metadata?.shared_challenges) || 0,
              isFollowing: Boolean(friend?.interaction_metadata?.is_following),
              isFollowedBy: Boolean(friend?.interaction_metadata?.is_followed_by),
              lastInteraction: friend?.interaction_metadata?.last_interaction || undefined,
              streakSimilarity: friend?.interaction_metadata?.streak_similarity || 'low',
              activityStatus: friend?.interaction_metadata?.activity_status || 'inactive',
            },
          };
        } catch (error) {
          console.error('Error processing friend recommendation:', error);
          return null;
        }
      }).filter(Boolean) : [];

      // Apply limit if specified
      const limitedRecommendations = limit ? recommendations.slice(0, limit) : recommendations;
      setFriends(limitedRecommendations);
    } catch (error) {
      console.error('Error loading smart friend recommendations:', error);
      setFriends([]);
    } finally {
      setIsLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    console.log("[useSmartFriendRecommendations] useEffect triggered", { userId: user?.id });
    loadRecommendations();
  }, [loadRecommendations]);

  const searchRecommendations = useCallback((query: string) => {
    if (!query.trim()) return friends;
    
    const lowerQuery = query.toLowerCase();
    return Array.isArray(friends) ? friends.filter(friend => 
      friend?.name?.toLowerCase().includes(lowerQuery) ||
      friend?.email?.toLowerCase().includes(lowerQuery)
    ) : [];
  }, [friends]);

  const getTopRecommendations = useCallback((count: number) => {
    return Array.isArray(friends) ? friends.slice(0, count) : [];
  }, [friends]);

  const getRecommendationsByScore = useCallback((minScore: number) => {
    return Array.isArray(friends) ? friends.filter(friend => 
      friend && friend.relevanceScore >= minScore
    ) : [];
  }, [friends]);

  return {
    friends: Array.isArray(friends) ? friends : [],
    isLoading,
    loadRecommendations,
    searchRecommendations,
    getTopRecommendations,
    getRecommendationsByScore,
  };
};
