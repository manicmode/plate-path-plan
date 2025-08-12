import React, { useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { ChallengeChatModal } from './ChallengeChatModal';
import { ChallengeChatPanel } from './ChallengeChatPanel';
import { useActiveChallengeIds } from '@/hooks/challenges/useActiveChallengeIds';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';

// Chatrooms are built from useMyChallenges() source of truth

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

  // Build rooms from My Active challenges
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
  // Selection sync (no conditional hooks)
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);

  // Fallback selection to avoid empty chat when rooms exist
  useEffect(() => {
    if (rooms.length && !selectedChatroomId && !localSelectedId) {
      const id = rooms[0].id;
      setLocalSelectedId(id);
      selectChatroom(id);
      console.info('[chat] fallback select', id);
    }
  }, [rooms, selectedChatroomId, localSelectedId, selectChatroom]);

  // Sync with store and initialChatroomId
  useEffect(() => {
    if (selectedChatroomId && selectedChatroomId !== localSelectedId) {
      setLocalSelectedId(selectedChatroomId);
    } else if (initialChatroomId && !localSelectedId) {
      setLocalSelectedId(initialChatroomId);
      selectChatroom(initialChatroomId);
    }
  }, [selectedChatroomId, initialChatroomId, localSelectedId, selectChatroom]);

  useEffect(() => {
    if (!isOpen) {
      clearSelection();
      setLocalSelectedId(null);
    }
  }, [isOpen, clearSelection]);

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
  console.info('[chat] render rooms', rooms.map((r) => r.id), 'selected', localSelectedId);

  return inline ? (
    <ChallengeChatPanel
      challengeId={activeId}
      challengeName={rooms.find(r => r.id === activeId)?.name || 'Chat'}
      participantCount={rooms.find(r => r.id === activeId)?.participantCount || 0}
      showHeader={false}
    />
  ) : (
    <ChallengeChatModal
      open={true}
      onOpenChange={onOpenChange}
      challengeId={activeId}
      challengeName={rooms.find(r => r.id === activeId)?.name || 'Chat'}
      participantCount={rooms.find(r => r.id === activeId)?.participantCount || 0}
      challengeParticipants={[]}
      showChatroomSelector={rooms.length > 1}
      showHeader={true}
    />
  );
};
