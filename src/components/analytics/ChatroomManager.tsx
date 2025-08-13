import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { ChallengeChatModal } from './ChallengeChatModal';
import { ChallengeChatPanel } from './ChallengeChatPanel';
import { useActiveChallengeIds } from '@/hooks/challenges/useActiveChallengeIds';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';

type ChatroomManagerProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialChatroomId?: string;
  inline?: boolean;
};

export const ChatroomManager: React.FC<ChatroomManagerProps> = ({
  isOpen,
  onOpenChange,
  initialChatroomId,
  inline = false,
}) => {
  const { selectedChatroomId, selectChatroom, clearSelection } = useChatStore();
  const { ids, isLoading } = useActiveChallengeIds();
  const { challenges: publicChallenges } = usePublicChallenges();
  const { challengesWithParticipation: privateChallenges } = usePrivateChallenges();

  const index = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: 'public'|'private'; participantCount?: number }>();
    (publicChallenges ?? []).forEach((c: any) => map.set(c.id, { id: c.id, name: c.title, type: 'public', participantCount: c.participant_count ?? 0 }));
    (privateChallenges ?? []).forEach((c: any) => map.set(c.id, { id: c.id, name: c.title, type: 'private', participantCount: (c as any).participant_count ?? 0 }));
    return map;
  }, [publicChallenges, privateChallenges]);

  const rooms = useMemo(
    () => ids.map((id) => index.get(id)).filter(Boolean) as Array<{ id: string; name: string; type: 'public'|'private'; participantCount?: number }>,
    [ids, index]
  );

  console.info('[chat] rooms.ids', rooms.map(r => r.id));
  console.info('[chat] selectedChatroomId', selectedChatroomId);

  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (rooms.length && !selectedChatroomId && !localSelectedId) {
      const id = rooms[0].id;
      setLocalSelectedId(id);
      selectChatroom(id);
      console.info('[mgr] autoselect first room', id);
    }
  }, [rooms, selectedChatroomId, localSelectedId, selectChatroom]);

  useEffect(() => {
    if (selectedChatroomId && selectedChatroomId !== localSelectedId) {
      setLocalSelectedId(selectedChatroomId);
    } else if (initialChatroomId && !localSelectedId && rooms.some(r => r.id === initialChatroomId)) {
      setLocalSelectedId(initialChatroomId);
      selectChatroom(initialChatroomId);
      console.info('[mgr] set initial room', initialChatroomId);
    }
  }, [selectedChatroomId, initialChatroomId, localSelectedId, selectChatroom, rooms]);

  // IMPORTANT: do not clear selection in inline mode (prevents remount wipes)
  useEffect(() => {
    if (inline) {
      console.info('[mgr] inline mode - not clearing selection on close');
      return;
    }
    if (!isOpen) {
      console.info('[mgr] modal closed - clearing selection');
      clearSelection();
      setLocalSelectedId(null);
    }
  }, [inline, isOpen, clearSelection]);

  if (isOpen && isLoading) return <div className="p-4">Loading chatrooms…</div>;

  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Active Challenges</h3>
        <p className="text-muted-foreground">Join a challenge to access chat</p>
      </div>
    );
  }

  const activeId = localSelectedId || rooms[0]?.id;
  const activeRoom = rooms.find(r => r.id === activeId);

  console.info('[chat] render rooms', rooms.map(r => r.id), 'selected', localSelectedId);

  return inline ? (
    <ChallengeChatPanel
      challengeId={activeId}
      challengeName={activeRoom?.name || 'Chat'}
      participantCount={activeRoom?.participantCount || 0}
      roomType={activeRoom?.type || 'public'}
      showHeader={false}
      noScroll
      hideComposer
    />
  ) : (
    <ChallengeChatModal
      open={true}
      onOpenChange={onOpenChange}
      challengeId={activeId}
      challengeName={activeRoom?.name || 'Chat'}
      participantCount={activeRoom?.participantCount || 0}
      challengeParticipants={[]}
      showChatroomSelector={rooms.length > 1}
      showHeader={true}
    />
  );
};
