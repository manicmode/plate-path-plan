import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FriendRequest {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  // User profile data
  user_profile?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
    user_id: string;
  };
  friend_profile?: {
    first_name: string;
    last_name: string;
    avatar_url?: string;
    user_id: string;
  };
}

export function useFriendRequests() {
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Not authenticated');
        return;
      }

      // Fetch incoming requests (where I am the friend_id)
      const { data: incoming, error: incomingError } = await supabase
        .from('user_friends')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          updated_at
        `)
        .eq('friend_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (incomingError) {
        console.error('Error fetching incoming requests:', incomingError);
        setError('Failed to load incoming requests');
      } else {
        // Fetch user profiles for incoming requests
        if (incoming && incoming.length > 0) {
          const userIds = incoming.map(req => req.user_id);
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, first_name, last_name, avatar_url')
            .in('user_id', userIds);
          
          const enrichedIncoming = incoming.map(req => ({
            ...req,
            user_profile: profiles?.find(p => p.user_id === req.user_id)
          }));
          setIncomingRequests(enrichedIncoming);
        } else {
          setIncomingRequests([]);
        }
      }

      // Fetch outgoing requests (where I am the user_id)
      const { data: outgoing, error: outgoingError } = await supabase
        .from('user_friends')
        .select(`
          id,
          user_id,
          friend_id,
          status,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (outgoingError) {
        console.error('Error fetching outgoing requests:', outgoingError);
        setError('Failed to load outgoing requests');
      } else {
        // Fetch user profiles for outgoing requests
        if (outgoing && outgoing.length > 0) {
          const friendIds = outgoing.map(req => req.friend_id);
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('user_id, first_name, last_name, avatar_url')
            .in('user_id', friendIds);
          
          const enrichedOutgoing = outgoing.map(req => ({
            ...req,
            friend_profile: profiles?.find(p => p.user_id === req.friend_id)
          }));
          setOutgoingRequests(enrichedOutgoing);
        } else {
          setOutgoingRequests([]);
        }
      }

    } catch (err) {
      console.error('Error in fetchRequests:', err);
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Set up real-time subscription for changes
  useEffect(() => {
    const channel = supabase
      .channel('friend-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_friends' },
        () => {
          // Refresh requests when there are changes
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  return {
    incomingRequests,
    outgoingRequests,
    loading,
    error,
    refresh: fetchRequests
  };
}