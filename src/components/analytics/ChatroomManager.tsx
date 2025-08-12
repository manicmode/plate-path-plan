import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { ChallengeChatModal } from './ChallengeChatModal';
import { supabase } from '@/integrations/supabase/client';

// ---- RLS-safe: 2-step ID-first loader (no joins)
async function fetchActiveChallengesForChat_RLSSafe(userId: string) {
  console.info('[chat] RLS-safe loader start for', userId);

  // 1) PUBLIC MEMBERSHIP: read challenge IDs from challenge_members
  const cm = await supabase
    .from('challenge_members')
    .select('challenge_id,status')
    .eq('user_id', userId);

  if (cm.error) console.error('[chat] challenge_members error', cm.error);
  const memberIds = (cm.data ?? []).map((r: any) => r.challenge_id);
  const memberStatuses = (cm.data ?? []).reduce((acc: Record<string, number>, r: any) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.info('[chat] memberIds', memberIds, 'byStatus', memberStatuses);

  // 2) PUBLIC OWNER: read IDs for challenges you own (no join)
  const owned = await supabase
    .from('challenges')
    .select('id')
    .eq('owner_user_id', userId);

  if (owned.error) console.error('[chat] challenges(owner) error', owned.error);
  const ownerIds = (owned.data ?? []).map((r: any) => r.id);
  console.info('[chat] ownerIds', ownerIds);

  const publicIds = Array.from(new Set([...(memberIds || []), ...(ownerIds || [])]));
  console.info('[chat] publicIds merged', publicIds);

  // 3) PRIVATE MEMBERSHIP: from participation table (no join)
  const pcp = await supabase
    .from('private_challenge_participations')
    .select('private_challenge_id')
    .eq('user_id', userId);

  if (pcp.error) console.error('[chat] pcp error', pcp.error);
  const privateIds = Array.from(new Set((pcp.data ?? []).map((r: any) => r.private_challenge_id)));
  console.info('[chat] privateIds', privateIds);

  // 4) FETCH PUBLIC CHALLENGE RECORDS by id IN (...)
  let publicChallenges: any[] = [];
  if (publicIds.length) {
    const pub = await supabase
      .from('challenges')
      .select('id,title,created_at')
      .in('id', publicIds);

    if (pub.error) console.error('[chat] fetch public by id error', pub.error);
    publicChallenges = pub.data ?? [];
  }

  // 5) FETCH PRIVATE CHALLENGE RECORDS by id IN (...)
  let privateChallenges: any[] = [];
  if (privateIds.length) {
    const priv = await supabase
      .from('private_challenges')
      .select('id,title,created_at')
      .in('id', privateIds);

    if (priv.error) console.error('[chat] fetch private by id error', priv.error);
    privateChallenges = priv.data ?? [];
  }

  const rows = [
    ...publicChallenges.map((c: any) => ({ id: c.id, title: c.title, visibility: 'public' })),
    ...privateChallenges.map((c: any) => ({ id: c.id, title: c.title ?? 'Private Challenge', visibility: 'private' })),
  ];

  // de-dupe
  const map = new Map<string, any>();
  rows.forEach((r) => map.set(r.id, r));
  const merged = Array.from(map.values());

  console.info('[chat] final rooms ids', merged.map((m) => m.id));
  return merged;
}

type ChatroomManagerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialChatroomId?: string;
};

export const ChatroomManager: React.FC<ChatroomManagerProps> = ({
  isOpen,
  onOpenChange,
  initialChatroomId,
}) => {
  const { selectedChatroomId, selectChatroom, clearSelection } = useChatStore();
  const [roomsSource, setRoomsSource] = useState<any[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

// Top-level effect: load rooms using RLS-safe loader
useEffect(() => {
  let cancelled = false;
  (async () => {
    setLoading(true);
    const { data: au } = await supabase.auth.getUser();
    const user = au?.user;
    if (!user) {
      console.warn('[chat] no auth user; rooms empty');
      if (!cancelled) { setRoomsSource([]); setLoading(false); }
      return;
    }
    const merged = await fetchActiveChallengesForChat_RLSSafe(user.id);
    if (!cancelled) { setRoomsSource(merged); setLoading(false); }
  })();
  return () => { cancelled = true; };
}, []);

  // Build rooms
  const rooms = useMemo(
    () =>
      (roomsSource ?? []).map((c) => ({
        id: c.id,
        name: c.title,
        type: (c.visibility ?? 'public') as 'public' | 'private',
        participantCount: c.participant_count ?? 0,
      })),
    [roomsSource]
  );

  // Selection sync (no conditional hooks)
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedChatroomId) {
      setLocalSelectedId(selectedChatroomId);
    } else if (initialChatroomId) {
      setLocalSelectedId(initialChatroomId);
      selectChatroom(initialChatroomId);
    } else if (rooms.length > 0 && !localSelectedId) {
      const firstId = rooms[0].id;
      setLocalSelectedId(firstId);
      selectChatroom(firstId);
    }
  }, [selectedChatroomId, initialChatroomId, rooms, localSelectedId, selectChatroom]);

  useEffect(() => {
    if (!isOpen) {
      clearSelection();
      setLocalSelectedId(null);
    }
  }, [isOpen, clearSelection]);

  if (!isOpen) return null;
  if (loading) return <div className="p-4">Loading chatrooms…</div>;

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Active Challenges</h3>
        <p className="text-muted-foreground">Join a challenge to access chat</p>
      </div>
    );
  }

  const selected = rooms.find((r) => r.id === localSelectedId) ?? rooms[0];
  console.info('[chat] render rooms', rooms.map((r) => r.id), 'selected', localSelectedId);

  return (
    <ChallengeChatModal
      open={true}
      onOpenChange={onOpenChange}
      challengeId={selected.id}
      challengeName={selected.name}
      participantCount={selected.participantCount}
      challengeParticipants={[]}
      showChatroomSelector={rooms.length > 1}
    />
  );
};
