import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export interface ChallengeMessage {
  id?: string | number;
  tempId?: string;
  challenge_id: string;
  user_id: string;
  content: string;
  created_at: string;
  pending?: boolean;
}

// Race-safe, merge-only reconcile function
function reconcile(prev: ChallengeMessage[], incoming: ChallengeMessage[]) {
  const map = new Map<string, ChallengeMessage>();
  const byId = (m: ChallengeMessage) => String(m.id ?? m.tempId);

  for (const m of prev) map.set(byId(m), m);

  for (const m of incoming) {
    const key = byId(m);

    // If this is a server row, try to replace a temp optimistic row
    if (m.id && !m.tempId) {
      for (const [tempKey, tempMsg] of map) {
        if (
          tempKey.startsWith('temp-') &&
          tempMsg.user_id === m.user_id &&
          tempMsg.content === m.content &&
          Math.abs(new Date(tempMsg.created_at).getTime() - new Date(m.created_at).getTime()) < 5000
        ) {
          map.delete(tempKey);
          break;
        }
      }
    }

    map.set(key, { ...map.get(key), ...m });
  }

  return [...map.values()].sort((a, b) => {
    const timeA = new Date(a.created_at ?? '').getTime();
    const timeB = new Date(b.created_at ?? '').getTime();
    if (timeA !== timeB) return timeA - timeB;
    return String(a.id ?? a.tempId).localeCompare(String(b.id ?? b.tempId));
  });
}

export function useChallengeMessages(challengeId: string | null) {
  const [messages, setMessages] = useState<ChallengeMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();
  const seq = useRef(0);

  useEffect(() => {
    if (!challengeId) {
      setMessages([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const my = ++seq.current;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('challenge_messages')
          .select('*')
          .eq('challenge_id', challengeId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (seq.current !== my) return;

        setMessages(prev => reconcile(prev, (data ?? []) as ChallengeMessage[]));
        console.info('[chat] fetch merged', { count: data?.length ?? 0, challengeId, seq: my });
      } catch (err) {
        if (seq.current !== my) return;
        setError(err as Error);
        console.error('[chat] fetch error', err);
      } finally {
        if (seq.current !== my) return;
        setIsLoading(false);
      }
    })();
  }, [challengeId]);

  useEffect(() => {
    if (!challengeId) return;

    const channel = supabase
      .channel(`challenge-messages-${challengeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'challenge_messages', filter: `challenge_id=eq.${challengeId}` },
        payload => {
          const newMessage = payload.new as ChallengeMessage;
          setMessages(prev => reconcile(prev, [newMessage]));
          console.info('[chat] RT insert merged', newMessage.id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [challengeId]);

  const sendMessage = async (content: string) => {
    const text = content.trim();
    if (!challengeId || !user?.id || !text) return null;

    const now = new Date().toISOString();
    const tempId = `temp-${Date.now()}-${user.id}`;

    const optimistic: ChallengeMessage = {
      id: undefined,
      tempId,
      challenge_id: challengeId,
      user_id: user.id,
      content: text,
      created_at: now,
      pending: true,
    };

    setMessages(prev => reconcile(prev, [optimistic]));
    console.info('[chat] optimistic add', tempId);

    try {
      const { data, error } = await supabase
        .from('challenge_messages')
        .insert({ challenge_id: challengeId, user_id: user.id, content: text })
        .select('*')
        .single();

      if (error) throw error;

      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.tempId !== tempId);
        return reconcile(withoutTemp, [data as ChallengeMessage]);
      });

      console.info('[chat] send ok, replaced temp with server', (data as any)?.id);
      return data as ChallengeMessage;
    } catch (err) {
      setMessages(prev => prev.filter(m => m.tempId !== tempId));
      console.error('[chat] send error', err);
      throw err;
    }
  };

  return { messages, isLoading, error, sendMessage };
}
