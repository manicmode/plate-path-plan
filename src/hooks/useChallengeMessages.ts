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
        (payload) => {
          const row = payload.new as ChallengeMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            const i = prev.findIndex(
              (m: any) => String(m.id).startsWith('local-') && m.user_id === (row as any).user_id && m.content === (row as any).content
            );
            if (i >= 0) {
              const next = prev.slice();
              next[i] = row as any;
              return next;
            }
            return [...prev, row as any];
          });
        }
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

    const temp: ChallengeMessage = {
      id: `local-${Date.now()}`,
      challenge_id: challengeId,
      user_id: user.id,
      content: text,
      created_at: new Date().toISOString(),
    };

    // Optimistically show it immediately
    setMessages((prev) => [...prev, temp as any]);

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

      // Replace temp with real row
      setMessages((prev) => prev.map((m) => (m.id === temp.id ? (data as any) : m)));
      return data as any;
    } catch (err) {
      // Rollback optimistic insert on error
      setMessages((prev) => prev.filter((m) => m.id !== temp.id));
      console.error('[chat] send error', err);
      throw err;
    }
  };

  return { messages, isLoading, error, sendMessage };
}
