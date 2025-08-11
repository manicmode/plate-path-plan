import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface MyChallenge {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  visibility: 'public' | 'private';
  duration_days: number;
  cover_emoji: string | null;
  invite_code: string | null;
  owner_user_id: string;
  created_at: string;
  participant_count: number;
  user_role: 'owner' | 'member';
  user_status: 'joined' | 'left' | 'banned';
  joined_at: string;
}

interface UseMyChallengesResult {
  data: MyChallenge[];
  isLoading: boolean;
  error: Error | null;
  fetchNext: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useMyChallenges(): UseMyChallengesResult {
  const { user } = useAuth();
  const [data, setData] = useState<MyChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchChallenges = useCallback(async (reset = false) => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      if (reset) {
        setIsLoading(true);
        setData([]);
      }

      // Get challenges where user is owner or member
      const { data: challengesData, error: challengesError } = await supabase
        .from('challenges')
        .select(`
          *,
          challenge_members!inner(
            user_id,
            role,
            status,
            joined_at
          )
        `)
        .or(`owner_user_id.eq.${user.id},challenge_members.user_id.eq.${user.id}`)
        .eq('challenge_members.status', 'joined')
        .order('created_at', { ascending: false })
        .limit(10);

      if (challengesError) throw challengesError;

      // Get participant counts for each challenge
      const challengesWithCounts: MyChallenge[] = [];
      
      for (const challenge of challengesData || []) {
        const { count, error: countError } = await supabase
          .from('challenge_members')
          .select('*', { count: 'exact', head: true })
          .eq('challenge_id', challenge.id)
          .eq('status', 'joined');

        if (countError) throw countError;

        // Find user's membership info
        const membership = challenge.challenge_members.find((m: any) => m.user_id === user.id);
        
        challengesWithCounts.push({
          ...challenge,
          participant_count: count || 0,
          user_role: membership?.role || (challenge.owner_user_id === user.id ? 'owner' : 'member'),
          user_status: membership?.status || 'joined',
          joined_at: membership?.joined_at || challenge.created_at,
        });
      }

      if (reset) {
        setData(challengesWithCounts);
      } else {
        setData(prev => [...prev, ...challengesWithCounts]);
      }

      setHasMore(challengesWithCounts.length === 10);
    } catch (err) {
      console.error('[useMyChallenges] Error:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch challenges'));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const fetchNext = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await fetchChallenges(false);
  }, [hasMore, isLoading, fetchChallenges]);

  const refresh = useCallback(async () => {
    await fetchChallenges(true);
  }, [fetchChallenges]);

  useEffect(() => {
    fetchChallenges(true);
  }, [fetchChallenges]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('my-challenges')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenges',
        },
        () => {
          refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refresh]);

  return {
    data,
    isLoading,
    error,
    fetchNext,
    refresh,
  };
}