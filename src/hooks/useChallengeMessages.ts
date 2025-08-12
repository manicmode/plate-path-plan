import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface ChallengeMessage {
  id: string | number;
  challenge_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export function useChallengeMessages(challengeId: string | null) {
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!challengeId) {
      setMessages([]);
      return;
    }

    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('challenge_messages')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: true });

      if (!isCancelled) {
        if (error) setError(error as any);
        setMessages(data ?? []);
        setIsLoading(false);
      }
    };

    load();

    const channel = supabase
      .channel(`challenge-messages-${challengeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'challenge_messages', filter: `challenge_id=eq.${challengeId}` },
        (payload) => setMessages((prev) => [...prev, payload.new as any])
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }, [challengeId]);

  const sendMessage = async (content: string) => {
    const text = (content ?? '').trim();
    if (!challengeId || !user?.id || !text) return null;

    try {
      const { data, error } = await supabase
        .from('challenge_messages')
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          content: text,
        })
        .select('*')
        .single();

      if (error) throw error;

      // Optimistically append to local state, guard against duplicates
      setMessages((prev) => {
        if (!data) return prev;
        const exists = prev.some((m) => m.id === (data as any).id);
        return exists ? prev : [...prev, data as any];
      });

      return data as any;
    } catch (err) {
      console.error('[useChallengeMessages] send error', err);
      throw err;
    }
  };

  return { messages, isLoading, error, sendMessage };
}
