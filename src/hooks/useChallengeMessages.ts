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


// --- NEW: reconcile helper (merge, never blindly replace) ---
function reconcile(prev: ChallengeMessage[], incoming: ChallengeMessage[]) {
  const byId = new Map<string, ChallengeMessage>();
  for (const m of prev) byId.set(String(m.id), m);

  for (const m of incoming) {
    for (const [id, p] of byId) {
      if (
        id.startsWith('local-') &&
        p.user_id === m.user_id &&
        p.content === m.content
      ) {
        byId.delete(id);
        break;
      }
    }
    byId.set(String(m.id), m);
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
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
        setMessages((prev) => reconcile(prev as any, (data ?? []) as any));
        console.info('[chat] fetch ok', { count: data?.length ?? 0 });
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
          setMessages((prev) => reconcile(prev as any, [row as any]));
          console.info('[chat] RT insert', (row as any)?.id);
        }
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }, [challengeId, user?.id]);

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
    console.info('[chat] optimistic add', temp.id);

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

      // Merge server row (auto-drops the local temp)
      setMessages((prev) => reconcile(prev as any, [data as any]));
      console.info('[chat] insert ok', (data as any)?.id);
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
