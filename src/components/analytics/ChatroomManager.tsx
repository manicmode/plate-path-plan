import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { ChallengeChatModal } from './ChallengeChatModal';
import { supabase } from '@/integrations/supabase/client';

// ---- Local fallback: union public + private memberships for current user
async function fetchActiveChallengesForChat(userId: string) {
  console.info('[chat] fallback loader: fetching active challenges for', userId);

  // PUBLIC challenges: owner or member (joined)
  const pub = await supabase
    .from('challenges')
    .select(
      `
      id, title, visibility, created_at,
      challenge_members!inner(user_id, status),
      owner_user_id
    `
    )
    .or(`owner_user_id.eq.${userId},challenge_members.user_id.eq.${userId}`)
    .eq('challenge_members.status', 'joined')
    .order('created_at', { ascending: false });

  if (pub.error) {
    console.error('[chat] public fetch error', pub.error);
  }

  // PRIVATE challenges: via private_challenge_participations
  const priv = await supabase
    .from('private_challenge_participations')
    .select(
      `
      private_challenge_id,
      private_challenges:private_challenges!inner(
        id, title, created_at
      )
    `
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (priv.error) {
    console.error('[chat] private fetch error', priv.error);
  }

  const publicRows = (pub.data ?? []).map((c: any) => ({
    id: c.id,
    title: c.title,
    visibility: 'public',
    participant_count: undefined,
  }));

  const privateRows = (priv.data ?? [])
    .filter((r: any) => r.private_challenges?.id)
    .map((r: any) => ({
      id: r.private_challenges.id,
      title: r.private_challenges.title ?? 'Private Challenge',
      visibility: 'private',
      participant_count: undefined,
    }));

  // de-dupe by id just in case
  const map = new Map<string, any>();
  [...publicRows, ...privateRows].forEach((c) => map.set(c.id, c));
  const merged = Array.from(map.values());
  console.info('[chat] rooms ids', merged.map((m) => m.id));
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

  // Top-level effect: load rooms using the safe fallback loader
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        console.warn('[chat] no auth user; showing empty rooms');
        if (!cancelled) {
          setRoomsSource([]);
          setLoading(false);
        }
        return;
      }

      const merged = await fetchActiveChallengesForChat(user.id);
      if (!cancelled) {
        setRoomsSource(merged);
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
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
