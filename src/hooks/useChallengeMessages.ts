import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';

export type RoomType = 'public' | 'private';
const CHAT_COLS = 'id,challenge_id,user_id,content,created_at';

export interface ChallengeMessage {
  id?: string | number;
  tempId?: string;
  challenge_id: string;
  user_id: string;
  content: string;
  created_at: string;
  pending?: boolean;
  // joined user (nullable if RLS denies)
  user?: { name?: string | null; display_name?: string | null; avatar_url?: string | null };
}

function reconcile(prev: ChallengeMessage[], incoming: ChallengeMessage[]) {
  const keyOf = (m: ChallengeMessage) => String(m.id ?? m.tempId);
  const map = new Map<string, ChallengeMessage>();
  for (const m of prev) map.set(keyOf(m), m);

  for (const m of incoming) {
    // Replace optimistic with server row (match by user + content + close timestamps)
    if (m.id && !m.tempId) {
      for (const [k, t] of map) {
        if (
          k.startsWith('temp-') &&
          t.user_id === m.user_id &&
          t.content === m.content &&
          Math.abs(new Date(t.created_at).getTime() - new Date(m.created_at).getTime()) < 8000
        ) {
          map.delete(k);
          break;
        }
      }
    }
    const k = keyOf(m);
    map.set(k, { ...map.get(k), ...m });
  }

  const sorted = [...map.values()].sort((a, b) => {
    const ta = new Date(a.created_at ?? '').getTime();
    const tb = new Date(b.created_at ?? '').getTime();
    if (ta !== tb) return ta - tb;
    return keyOf(a).localeCompare(keyOf(b));
  });
  return sorted;
}

export function useChallengeMessages(challengeId: string | null, roomType: RoomType = 'public') {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChallengeMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // request sequence + current room tracking
  const seq = useRef(0);
  const currentKeyRef = useRef<string | null>(null);

  // compute table/column per room type
  const table = roomType === 'private' ? 'private_challenge_messages' : 'challenge_messages';
  const idCol = roomType === 'private' ? 'private_challenge_id' : 'challenge_id';
  const COLS = `id,${idCol},user_id,content,created_at`;

  // ⛑ RESET state when room changes to avoid bleed between chats
  useEffect(() => {
    const nextKey = challengeId ? `${roomType}:${challengeId}` : null;
    if (currentKeyRef.current !== nextKey) {
      currentKeyRef.current = nextKey;
      setMessages([]);
      setError(null);
      setIsLoading(false);
    }
  }, [challengeId, roomType]);

  // Local refetch helper (race-safe)
  const refetch = async (sid: number, id: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .select(COLS)
        .eq(CH_ID_COL, id)
        .order('created_at', { ascending: true });

      console.info('[chat] refetch OK', { challengeId: id, rows: data?.length ?? 0 });
      if (error) throw error;
      if (seq.current !== sid) return;
      setMessages(prev => reconcile(prev, (data ?? []) as unknown as ChallengeMessage[]));
      console.info('[chat] refetch merged', { count: data?.length ?? 0, challengeId: id, seq: sid });
    } catch (e) {
      if (seq.current !== sid) return;
      console.warn('[chat] refetch error', e);
    }
  };

  // Initial fetch on challenge change
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
        const { data, error } = await (supabase as any)
          .from(TABLE)
          .select(COLS)
          .eq(CH_ID_COL, challengeId)
          .order('created_at', { ascending: true });

        console.info('[chat] fetch OK', { challengeId, rows: data?.length ?? 0 });
        if (error) throw error;
        if (seq.current !== my) return;
        setMessages(prev => reconcile(prev, (data ?? []) as unknown as ChallengeMessage[]));
        console.info('[chat] fetch merged', { count: data?.length ?? 0, challengeId, seq: my });
      } catch (err) {
        if (seq.current !== my) return;
        setError(err as Error);
      } finally {
        if (seq.current !== my) return;
        setIsLoading(false);
      }
    })();
  }, [challengeId, isPrivate]);

  // Realtime INSERT
  useEffect(() => {
    if (!challengeId) return;
    const channel = supabase
      .channel(`${TABLE}-${challengeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: TABLE, filter: `${CH_ID_COL}=eq.${challengeId}` },
        async (payload) => {
          // Fetch one row for the new id
          const { data } = await (supabase as any)
            .from(TABLE)
            .select(COLS)
            .eq('id', payload.new.id)
            .single();

          console.info('[chat] RT fetch OK', { id: payload.new.id, found: !!data });
          const merged = (data
            ? [data as ChallengeMessage]
            : [payload.new as ChallengeMessage]);

          setMessages(prev => reconcile(prev, merged));
          console.info('[chat] RT insert merged', payload.new.id);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [challengeId, isPrivate]);

  // Optimistic send with “guaranteed persist”
  const sendMessage = async (content: string) => {
    const text = content.trim();
    if (!challengeId || !user?.id || !text) return null;

    const now = new Date().toISOString();
    const tempId = `temp-${Date.now()}-${user.id}`;
    const optimistic: ChallengeMessage = {
      tempId, challenge_id: challengeId, user_id: user.id, content: text, created_at: now, pending: true,
      user: { name: user.user_metadata?.name ?? null, display_name: user.user_metadata?.name ?? null, avatar_url: null }
    };
    setMessages(prev => reconcile(prev, [optimistic]));
    console.info('[chat] optimistic add', tempId);

    let insertedId: string | number | null = null;

    try {
      const { data, error } = await (supabase as any)
        .from(TABLE)
        .insert({ [CH_ID_COL]: challengeId, user_id: user.id, content: text } as any)
        .select(COLS)
        .single();

      console.info('[chat] insert OK', { challengeId, ok: !error });
      if (error) throw error;
      insertedId = (data as any)?.id ?? null;

      setMessages(prev => {
        const withoutTemp = prev.filter(m => m.tempId !== tempId);
        return reconcile(withoutTemp, [data as ChallengeMessage]);
      });

      console.info('[chat] send ok, replaced temp with server', insertedId);

      // Fallback: if RT didn’t arrive yet, force one refetch shortly
      const my = seq.current;
      setTimeout(() => {
        if (!insertedId) refetch(my, challengeId);
      }, 1500);

      return data as ChallengeMessage;
    } catch (err) {
      setMessages(prev => prev.filter(m => m.tempId !== tempId));
      console.error('[chat] send error', err);
      throw err;
    }
  };

  return { messages, isLoading, error, sendMessage };
}
