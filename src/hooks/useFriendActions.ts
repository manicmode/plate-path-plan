import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FriendUIRelation } from './useFriendStatuses';

interface UseFriendActionsProps {
  onStatusUpdate: (userId: string, relation: FriendUIRelation, requestId?: string) => void;
}

export const useFriendActions = ({ onStatusUpdate }: UseFriendActionsProps) => {
  const [cooldowns, setCooldowns] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());

  const addCooldown = useCallback((userId: string) => {
    setCooldowns(prev => new Set(prev).add(userId));
    setTimeout(() => {
      setCooldowns(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }, 10000); // 10 second cooldown
  }, []);

  const sendFriendRequest = useCallback(async (targetUserId: string) => {
    if (cooldowns.has(targetUserId)) {
      toast.error('Please wait before sending another request to this user');
      return false;
    }

    if (pending.has(targetUserId)) {
      return false;
    }

    setPending(prev => new Set(prev).add(targetUserId));
    
    // Optimistic update
    onStatusUpdate(targetUserId, 'outgoing_pending');

    try {
      const { error } = await supabase.rpc('send_friend_request', {
        target_user_id: targetUserId
      });

      if (error) {
        // Handle specific error codes
        if (error.code === 'P0001') {
          if (error.message === 'FRIEND_REQS_RATE_LIMIT') {
            toast.error('Daily request limit reached. Try again tomorrow.');
          } else if (error.message === 'FRIEND_REQS_DISABLED') {
            toast.error('This user isn\'t accepting friend requests.');
          } else {
            toast.error('Failed to send friend request');
          }
        } else {
          toast.error('Failed to send friend request');
        }
        
        // Rollback optimistic update
        onStatusUpdate(targetUserId, 'none');
        return false;
      }

      addCooldown(targetUserId);
      toast.success('Friend request sent!');
      return true;
    } catch (err) {
      console.error('Error sending friend request:', err);
      toast.error('Failed to send friend request');
      // Rollback optimistic update
      onStatusUpdate(targetUserId, 'none');
      return false;
    } finally {
      setPending(prev => {
        const newSet = new Set(prev);
        newSet.delete(targetUserId);
        return newSet;
      });
    }
  }, [cooldowns, pending, onStatusUpdate, addCooldown]);

  const acceptFriendRequest = useCallback(async (requestId: string, userId: string) => {
    if (pending.has(userId)) {
      return false;
    }

    setPending(prev => new Set(prev).add(userId));
    
    // Optimistic update
    onStatusUpdate(userId, 'friends');

    try {
      const { error } = await supabase.rpc('accept_friend_request', {
        request_id: requestId
      });

      if (error) {
        console.error('Error accepting friend request:', error);
        toast.error('Failed to accept friend request');
        // Rollback optimistic update
        onStatusUpdate(userId, 'incoming_pending', requestId);
        return false;
      }

      toast.success('Friend request accepted!');
      return true;
    } catch (err) {
      console.error('Error accepting friend request:', err);
      toast.error('Failed to accept friend request');
      // Rollback optimistic update
      onStatusUpdate(userId, 'incoming_pending', requestId);
      return false;
    } finally {
      setPending(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  }, [pending, onStatusUpdate]);

  const rejectFriendRequest = useCallback(async (requestId: string, userId: string) => {
    if (pending.has(userId)) {
      return false;
    }

    setPending(prev => new Set(prev).add(userId));
    
    // Optimistic update
    onStatusUpdate(userId, 'none');

    try {
      const { error } = await supabase.rpc('reject_friend_request', {
        request_id: requestId
      });

      if (error) {
        console.error('Error rejecting friend request:', error);
        toast.error('Failed to reject friend request');
        // Rollback optimistic update
        onStatusUpdate(userId, 'incoming_pending', requestId);
        return false;
      }

      toast.success('Friend request rejected');
      return true;
    } catch (err) {
      console.error('Error rejecting friend request:', err);
      toast.error('Failed to reject friend request');
      // Rollback optimistic update
      onStatusUpdate(userId, 'incoming_pending', requestId);
      return false;
    } finally {
      setPending(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  }, [pending, onStatusUpdate]);

  return {
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    isPending: (userId: string) => pending.has(userId),
    isOnCooldown: (userId: string) => cooldowns.has(userId)
  };
};