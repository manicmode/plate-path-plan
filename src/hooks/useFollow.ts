import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useToast } from '@/hooks/use-toast';

interface FollowStatus {
  isFollowing: boolean;
  isFollowedBy: boolean;
  followersCount: number;
  followingCount: number;
}

export const useFollow = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Get follow status for a user
  const getFollowStatus = useCallback(async (userId: string): Promise<FollowStatus | null> => {
    if (!user || userId === user.id) return null;

    try {
      const { data, error } = await supabase
        .rpc('get_follow_status', { target_user_id: userId });

      if (error) throw error;

      return {
        isFollowing: data?.[0]?.is_following || false,
        isFollowedBy: data?.[0]?.is_followed_by || false,
        followersCount: data?.[0]?.followers_count || 0,
        followingCount: data?.[0]?.following_count || 0
      };
    } catch (error) {
      console.error('Error getting follow status:', error);
      return null;
    }
  }, [user]);

  // Follow a user
  const followUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user || userId === user.id) return false;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_follows')
        .insert({
          user_id: user.id,
          followed_user_id: userId
        });

      if (error) throw error;

      // Send notification (optional)
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            userId: userId,
            title: 'New Follower! 🎉',
            body: `${user.name || user.email} started following you!`,
            data: { type: 'follow', followerId: user.id }
          }
        });
      } catch (notificationError) {
        console.log('Notification not sent:', notificationError);
      }

      toast({
        title: "Following! 🎉",
        description: "You're now following this user",
      });

      return true;
    } catch (error) {
      console.error('Error following user:', error);
      toast({
        title: "Failed to follow",
        description: "Please try again",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Unfollow a user
  const unfollowUser = useCallback(async (userId: string): Promise<boolean> => {
    if (!user || userId === user.id) return false;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('user_id', user.id)
        .eq('followed_user_id', userId);

      if (error) throw error;

      toast({
        title: "Unfollowed",
        description: "You're no longer following this user",
      });

      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toast({
        title: "Failed to unfollow",
        description: "Please try again",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Get user's followers list
  const getFollowers = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          user_id,
          created_at,
          user_profiles!user_follows_user_id_fkey (
            user_id,
            first_name,
            last_name
          )
        `)
        .eq('followed_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting followers:', error);
      return [];
    }
  }, []);

  // Get user's following list
  const getFollowing = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select(`
          followed_user_id,
          created_at,
          user_profiles!user_follows_followed_user_id_fkey (
            user_id,
            first_name,
            last_name
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting following:', error);
      return [];
    }
  }, []);

  // Check if users are mutually following each other
  const areMutualFollowers = useCallback(async (userId1: string, userId2: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_follows')
        .select('id')
        .or(`and(user_id.eq.${userId1},followed_user_id.eq.${userId2}),and(user_id.eq.${userId2},followed_user_id.eq.${userId1})`);

      if (error) throw error;
      return (data?.length || 0) === 2;
    } catch (error) {
      console.error('Error checking mutual follow:', error);
      return false;
    }
  }, []);

  return {
    isLoading,
    getFollowStatus,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    areMutualFollowers
  };
};