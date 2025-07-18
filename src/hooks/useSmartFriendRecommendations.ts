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
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_smart_friend_recommendations', { current_user_id: user.id });

      if (error) throw error;

      const recommendations: SmartFriend[] = (data || []).map((friend: any) => ({
        id: friend.friend_id,
        name: friend.friend_name,
        email: friend.friend_email,
        phone: friend.friend_phone,
        relevanceScore: friend.relevance_score,
        metadata: {
          chatCount: friend.interaction_metadata.chat_count,
          sharedChallenges: friend.interaction_metadata.shared_challenges,
          isFollowing: friend.interaction_metadata.is_following,
          isFollowedBy: friend.interaction_metadata.is_followed_by,
          lastInteraction: friend.interaction_metadata.last_interaction,
          streakSimilarity: friend.interaction_metadata.streak_similarity,
          activityStatus: friend.interaction_metadata.activity_status,
        },
      }));

      // Apply limit if specified
      const limitedRecommendations = limit ? recommendations.slice(0, limit) : recommendations;
      setFriends(limitedRecommendations);
    } catch (error) {
      console.error('Error loading smart friend recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, limit]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  const searchRecommendations = useCallback((query: string) => {
    if (!query.trim()) return friends;
    
    const lowerQuery = query.toLowerCase();
    return friends.filter(friend => 
      friend.name.toLowerCase().includes(lowerQuery) ||
      friend.email?.toLowerCase().includes(lowerQuery)
    );
  }, [friends]);

  const getTopRecommendations = useCallback((count: number) => {
    return friends.slice(0, count);
  }, [friends]);

  const getRecommendationsByScore = useCallback((minScore: number) => {
    return friends.filter(friend => friend.relevanceScore >= minScore);
  }, [friends]);

  return {
    friends,
    isLoading,
    loadRecommendations,
    searchRecommendations,
    getTopRecommendations,
    getRecommendationsByScore,
  };
};