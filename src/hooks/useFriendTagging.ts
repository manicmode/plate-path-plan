import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

interface Friend {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export const useFriendTagging = () => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const loadFriends = useCallback(async () => {
    if (!user) return;

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
  }, [user]);

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
    if (!query.trim()) return friends;
    
    const lowerQuery = query.toLowerCase();
    return friends.filter(friend => 
      friend.name.toLowerCase().includes(lowerQuery) ||
      friend.email?.toLowerCase().includes(lowerQuery)
    );
  }, [friends]);

  const getFriendById = useCallback((friendId: string) => {
    return friends.find(friend => friend.id === friendId);
  }, [friends]);

  return {
    friends,
    isLoading,
    loadFriends,
    addFriend,
    searchFriends,
    getFriendById
  };
};