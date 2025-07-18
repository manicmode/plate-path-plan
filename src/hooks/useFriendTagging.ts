import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useSmartFriendRecommendations, SmartFriend } from './useSmartFriendRecommendations';

interface Friend {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export const useFriendTagging = (useSmartRecommendations: boolean = true) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  
  // Use smart recommendations when enabled
  const { 
    friends: smartFriends, 
    isLoading: smartLoading,
    searchRecommendations,
    getTopRecommendations
  } = useSmartFriendRecommendations();

  const loadFriends = useCallback(async () => {
    if (!user || useSmartRecommendations) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_mutual_friends', { current_user_id: user.id });

      if (error) throw error;

      const friendsList = data?.map((friend: any) => ({
        id: friend.friend_id,
        name: friend.friend_name || friend.friend_email,
        email: friend.friend_email,
        phone: friend.friend_phone
      })) || [];

      setFriends(friendsList);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, useSmartRecommendations]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const addFriend = useCallback(async (friendUserId: string) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .rpc('add_friend_from_contact', { contact_user_id: friendUserId });

      if (error) throw error;

      if (data) {
        await loadFriends(); // Refresh friends list
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error adding friend:', error);
      return false;
    }
  }, [user, loadFriends]);

  const searchFriends = useCallback((query: string) => {
    if (useSmartRecommendations) {
      return searchRecommendations(query).map(smartFriend => ({
        id: smartFriend.id,
        name: smartFriend.name,
        email: smartFriend.email,
        phone: smartFriend.phone
      }));
    }

    if (!query.trim()) return friends;
    
    const lowerQuery = query.toLowerCase();
    return friends.filter(friend => 
      friend.name.toLowerCase().includes(lowerQuery) ||
      friend.email?.toLowerCase().includes(lowerQuery)
    );
  }, [friends, useSmartRecommendations, searchRecommendations]);

  const getFriendById = useCallback((friendId: string) => {
    if (useSmartRecommendations) {
      const smartFriend = smartFriends.find(friend => friend.id === friendId);
      return smartFriend ? {
        id: smartFriend.id,
        name: smartFriend.name,
        email: smartFriend.email,
        phone: smartFriend.phone
      } : undefined;
    }
    return friends.find(friend => friend.id === friendId);
  }, [friends, smartFriends, useSmartRecommendations]);

  // Get the appropriate friends list based on mode
  const currentFriends = useSmartRecommendations 
    ? smartFriends.map(sf => ({ id: sf.id, name: sf.name, email: sf.email, phone: sf.phone }))
    : friends;

  return {
    friends: currentFriends,
    smartFriends: useSmartRecommendations ? smartFriends : [],
    isLoading: useSmartRecommendations ? smartLoading : isLoading,
    loadFriends,
    addFriend,
    searchFriends,
    getFriendById,
    getTopRecommendations: useSmartRecommendations ? getTopRecommendations : undefined,
  };
};