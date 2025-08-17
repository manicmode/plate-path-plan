import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseFriendRealtimeProps {
  onUserIdsChanged: (userIds: string[]) => void;
  enabled?: boolean;
}

export function useFriendRealtime({ onUserIdsChanged, enabled = true }: UseFriendRealtimeProps) {
  const affectedUserIdsRef = useRef<Set<string>>(new Set());
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const debouncedRefresh = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const userIds = Array.from(affectedUserIdsRef.current);
      if (userIds.length > 0) {
        onUserIdsChanged(userIds);
        affectedUserIdsRef.current.clear();
      }
    }, 200);
  }, [onUserIdsChanged]);

  const handleRealtimeEvent = useCallback((payload: any) => {
    const { new: newRecord, old: oldRecord, eventType } = payload;
    
    // Extract affected user IDs based on event type
    const currentUser = supabase.auth.getUser().then(({ data }) => data.user?.id);
    
    currentUser.then(userId => {
      if (!userId) return;

      // Determine which user IDs are affected (the "other party")
      const affectedIds: string[] = [];
      
      if (eventType === 'DELETE' && oldRecord) {
        // On delete, we need to refresh both parties
        if (oldRecord.user_id === userId) {
          affectedIds.push(oldRecord.friend_id);
        } else if (oldRecord.friend_id === userId) {
          affectedIds.push(oldRecord.user_id);
        }
      } else if (newRecord) {
        // On insert/update, check the new record
        if (newRecord.user_id === userId) {
          affectedIds.push(newRecord.friend_id);
        } else if (newRecord.friend_id === userId) {
          affectedIds.push(newRecord.user_id);
        }
      }

      // Add to batch set and trigger debounced refresh
      affectedIds.forEach(id => affectedUserIdsRef.current.add(id));
      
      if (affectedIds.length > 0) {
        debouncedRefresh();
      }
    });
  }, [debouncedRefresh]);

  useEffect(() => {
    if (!enabled) return;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Clean up existing channel if any
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      // Create new channel
      const channel = supabase
        .channel(`friends:${user.id}`)
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'user_friends',
            filter: `user_id=eq.${user.id}`
          },
          handleRealtimeEvent
        )
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'user_friends',
            filter: `friend_id=eq.${user.id}`
          },
          handleRealtimeEvent
        )
        .subscribe();

      channelRef.current = channel;
    };

    setupRealtime();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [enabled, handleRealtimeEvent]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
}