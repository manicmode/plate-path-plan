import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

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
    if (!challengeId || !content.trim() || !user?.id) return;
    const { error } = await supabase
      .from('challenge_messages')
      .insert({ challenge_id: challengeId, content: content.trim(), user_id: user.id });
    if (error) throw error;
  };

  return { messages, isLoading, error, sendMessage };
}
