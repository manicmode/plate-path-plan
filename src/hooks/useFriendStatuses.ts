import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type FriendUIRelation =
  | 'self'
  | 'hidden_by_privacy'
  | 'friends'
  | 'outgoing_pending'
  | 'incoming_pending'
  | 'none';

interface PendingRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
}

interface FriendStatus {
  userId: string;
  relation: FriendUIRelation;
  requestId?: string; // For incoming_pending
}

export const useFriendStatuses = (targetIds: string[]) => {
  const [statusMap, setStatusMap] = useState<Map<string, FriendStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetIdsStr = useMemo(() => targetIds.sort().join(','), [targetIds]);

  const loadStatuses = async () => {
    if (!targetIds.length) {
      setStatusMap(new Map());
      setLoading(false);
      return;
    }

    const startTime = performance.now();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      // Initialize status map with 'none' for all targets
      const newStatusMap = new Map<string, FriendStatus>();
      targetIds.forEach(id => {
        if (id === user.id) {
          newStatusMap.set(id, { userId: id, relation: 'self' });
        } else {
          newStatusMap.set(id, { userId: id, relation: 'none' });
        }
      });

      // Get privacy settings for all target users
      const { data: privacyData, error: privacyError } = await supabase.rpc('get_privacy_settings_for_users', {
        target_ids: targetIds
      });

      if (privacyError) {
        console.error('Error fetching privacy settings:', privacyError);
        // Continue without privacy data - default to allowing requests
      } else if (privacyData) {
        privacyData.forEach(setting => {
          if (!setting.allow_challenge_friend_requests) {
            newStatusMap.set(setting.user_id, { userId: setting.user_id, relation: 'hidden_by_privacy' });
          }
        });
      }

      // Get all friend relationships for current user
      const { data: friendsData, error: friendsError } = await supabase
        .from('user_friends')
        .select('id, user_id, friend_id, status')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .in('status', ['accepted', 'pending']);

      if (friendsError) {
        console.error('Error fetching friends data:', friendsError);
        setError('Failed to load friend status');
        setLoading(false);
        return;
      }

      // Process friend relationships
      friendsData?.forEach(friendship => {
        const isCurrentUserSender = friendship.user_id === user.id;
        const otherId = isCurrentUserSender ? friendship.friend_id : friendship.user_id;
        
        // Only process if this user is in our target list
        if (!targetIds.includes(otherId)) return;

        const currentStatus = newStatusMap.get(otherId);
        if (!currentStatus || currentStatus.relation === 'self' || currentStatus.relation === 'hidden_by_privacy') {
          return;
        }

        if (friendship.status === 'accepted') {
          newStatusMap.set(otherId, { userId: otherId, relation: 'friends' });
        } else if (friendship.status === 'pending') {
          if (isCurrentUserSender) {
            newStatusMap.set(otherId, { userId: otherId, relation: 'outgoing_pending' });
          } else {
            newStatusMap.set(otherId, { userId: otherId, relation: 'incoming_pending', requestId: friendship.id });
          }
        }
      });

      setStatusMap(newStatusMap);
      setError(null);
      
      // Dev metrics for load time
      if (import.meta.env.DEV) {
        const loadTime = performance.now() - startTime;
        console.info(`FRIEND_STATUS_LOAD_TIME: ${loadTime.toFixed(2)}ms for ${targetIds.length} users`);
      }
    } catch (err) {
      console.error('Error loading friend statuses:', err);
      setError('Failed to load friend status');
    } finally {
      setLoading(false);
    }
  };

  // Debounced status loading to handle fast re-renders
  const debouncedLoadStatuses = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      loadStatuses();
    }, 200); // 200ms debounce
  }, [targetIdsStr]);

  useEffect(() => {
    debouncedLoadStatuses();
    
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [debouncedLoadStatuses]);

  const updateStatus = (userId: string, relation: FriendUIRelation, requestId?: string) => {
    setStatusMap(prev => new Map(prev.set(userId, { userId, relation, requestId })));
  };

  return {
    statusMap,
    loading,
    error,
    refresh: loadStatuses,
    updateStatus
  };
};