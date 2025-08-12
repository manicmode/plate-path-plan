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

export function useMyChallenges(options?: { activeOnly?: boolean }): UseMyChallengesResult {
  const { user } = useAuth();
  const [data, setData] = useState<MyChallenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const activeOnly = options?.activeOnly ?? true;

  const fetchChallenges = useCallback(async (reset = false) => {
    if (!user?.id) {
      setIsLoading(false);
      setData([]);
      return;
    }

    try {
      setError(null);
      console.info('[my] uid', user?.id);
      if (reset) {
        setIsLoading(true);
        setData([]);
      }

      // A) Public challenges I OWN
      const { data: ownedPub, error: ownedErr } = await supabase
        .from('challenges')
        .select('id, title, description, category, visibility, duration_days, cover_emoji, invite_code, owner_user_id, created_at')
        .eq('owner_user_id', user.id);
       if (ownedErr) throw ownedErr;
       console.info('[my] ownedPub.count', ownedPub?.length || 0, (ownedPub ?? []).map((c: any) => c.id));

      // B) Public challenges I JOINED
      const { data: myMemberRows, error: memErr } = await supabase
        .from('challenge_members')
        .select('challenge_id, status')
        .eq('user_id', user.id)
        .eq('status', 'joined');
       if (memErr) throw memErr;
       console.info('[my] joinedRows.count', myMemberRows?.length || 0, (myMemberRows ?? []).map((r: any) => r.challenge_id));

      let joinedPub: any[] = [];
      const joinedIds = (myMemberRows ?? []).map((r: any) => r.challenge_id);
      if (joinedIds.length > 0) {
        const { data: joinedRows, error: joinedErr } = await supabase
          .from('challenges')
          .select('id, title, description, category, visibility, duration_days, cover_emoji, invite_code, owner_user_id, created_at')
          .in('id', joinedIds);
        if (joinedErr) throw joinedErr;
        joinedPub = joinedRows ?? [];
       }
       console.info('[my] joinedPub.count', joinedPub?.length || 0, (joinedPub ?? []).map((c: any) => c.id));

      // C) Private challenges (creator or participant)
      const { data: myPrivParts, error: privPartsErr } = await (supabase as any)
        .from('private_challenge_participations')
        .select('private_challenge_id, status, joined_at')
        .eq('user_id', user.id)
        .eq('status', 'joined');
       if (privPartsErr) throw privPartsErr;
       console.info('[my] privPartIds.count', myPrivParts?.length || 0, (myPrivParts ?? []).map((r: any) => r.private_challenge_id));

      const { data: ownedPriv, error: ownedPrivErr } = await supabase
        .from('private_challenges')
        .select('id')
        .eq('creator_id', user.id);
       if (ownedPrivErr) throw ownedPrivErr;
       console.info('[my] ownedPriv.count', ownedPriv?.length || 0, (ownedPriv ?? []).map((r: any) => r.id));

      const privIds: string[] = [];
      (myPrivParts ?? []).forEach((r: any) => {
        if (r?.private_challenge_id) privIds.push(r.private_challenge_id);
      });
      (ownedPriv ?? []).forEach((r: any) => {
        if (r?.id && !privIds.includes(r.id)) privIds.push(r.id);
      });

      let privateList: MyChallenge[] = [];
      if (privIds.length > 0) {
        const { data: privRows, error: privErr } = await supabase
          .from('private_challenges')
          .select('id, title, created_at, duration_days, creator_id')
          .in('id', privIds);
        if (privErr) throw privErr;

        privateList = (privRows ?? []).map((pc: any) => ({
          id: pc.id,
          title: pc.title ?? 'Private Challenge',
          description: null,
          category: null,
          visibility: 'private',
          duration_days: pc.duration_days ?? 7,
          cover_emoji: null,
          invite_code: null,
          owner_user_id: pc.creator_id,
          created_at: pc.created_at,
          participant_count: 0,
          user_role: pc.creator_id === user.id ? 'owner' : 'member',
          user_status: 'joined',
          joined_at: pc.created_at,
        } as MyChallenge));
      }

       console.info('[my] privRows.count', privateList?.length || 0, privateList?.map((c: any) => c.id));

       // Map public challenge rows to MyChallenge shape
      const publicMapped: MyChallenge[] = ([...(ownedPub ?? []), ...joinedPub] as any[]).map((ch: any) => ({
        id: ch.id,
        title: ch.title ?? 'Challenge',
        description: ch.description ?? null,
        category: ch.category ?? null,
        visibility: (ch.visibility ?? 'public') as 'public' | 'private',
        duration_days: ch.duration_days ?? 7,
        cover_emoji: ch.cover_emoji ?? null,
        invite_code: ch.invite_code ?? null,
        owner_user_id: ch.owner_user_id,
        created_at: ch.created_at,
        participant_count: 0,
        user_role: ch.owner_user_id === user.id ? 'owner' : 'member',
        user_status: 'joined',
        joined_at: ch.created_at,
      }));

      // Merge and de-dupe (prefer private entry if collision)
      const mergedMap = new Map<string, MyChallenge>();
      publicMapped.forEach((c) => mergedMap.set(c.id, c));
      privateList.forEach((c) => mergedMap.set(c.id, c));
      const mergedList = Array.from(mergedMap.values());

      // Active-only filter (duration-based fallback)
      const now = new Date();
      const isActive = (row: MyChallenge) => {
        if (!row?.duration_days || !row?.created_at) return true;
        const end = new Date(new Date(row.created_at).getTime() + row.duration_days * 86400000);
        return end >= now;
      };
      let finalList = activeOnly ? mergedList.filter(isActive) : mergedList;

      // Orphan guard (defensive): ensure id existed in fetched sources
      const validIds = new Set<string>([
        ...publicMapped.map((c) => c.id),
        ...privateList.map((c) => c.id),
      ]);
      finalList = finalList.filter((r) => validIds.has(r.id));

      console.info('[my] useMyChallenges.active.ids', finalList.map(c => c.id));

      setData(finalList);
      setHasMore(false);
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

  console.info('[my] useMyChallenges.ids', (data || []).map(c => c.id));
  return {
    data,
    isLoading,
    error,
    fetchNext,
    refresh,
  };
}