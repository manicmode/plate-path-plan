
import { useState, useEffect } from 'react';
import { ChallengeChatModal } from './ChallengeChatModal';
import { useMyChallenges } from '@/hooks/useMyChallenges';
import { useChatStore } from '@/store/chatStore';

interface Chatroom {
  id: string;
  name: string;
  type: 'public' | 'private';
  participantCount: number;
  participantIds?: string[];
  unreadCount?: number;
}

interface ChatroomManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialChatroomId?: string;
}

export const ChatroomManager = ({ isOpen, onOpenChange, initialChatroomId }: ChatroomManagerProps) => {
  const { data: myChallenges } = useMyChallenges();
  const { selectedChatroomId, selectChatroom, clearSelection } = useChatStore();
  const [activeChatroomId, setActiveChatroomId] = useState<string | null>(null);
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);

  // Build chatrooms list from user's challenge participations (Supabase source of truth)
  useEffect(() => {
    const availableChatrooms: Chatroom[] = [];

    const list = myChallenges || [];
    const challengeIdsUsedInChatQuery = list.map(c => c.id);

    // Instrumentation logs (temporary)
    console.info('[chat] activeChallenges.count', list.length, list.map(c => c.id));
    console.info('[chat] chatQuery.challengeIds', challengeIdsUsedInChatQuery);

    list.forEach(ch => {
      availableChatrooms.push({
        id: ch.id,
        name: ch.title,
        type: (ch.visibility === 'public' ? 'public' : 'private'),
        participantCount: ch.participant_count || 0,
        participantIds: [],
      });
    });

    setChatrooms(availableChatrooms);

    // Auto-select based on global store or first available
    if (availableChatrooms.length > 0) {
      if (selectedChatroomId) {
        setActiveChatroomId(selectedChatroomId);
      } else if (!activeChatroomId) {
        const firstId = availableChatrooms[0].id;
        setActiveChatroomId(firstId);
        selectChatroom(firstId);
      }
    }
  }, [myChallenges, activeChatroomId, selectedChatroomId, selectChatroom]);

  // Preselect chatroom when requested from CTA
  useEffect(() => {
    if (initialChatroomId) {
      setActiveChatroomId(initialChatroomId);
      selectChatroom(initialChatroomId);
    }
  }, [initialChatroomId, selectChatroom]);

  // Clear selection when manager closes
  useEffect(() => {
    if (!isOpen) {
      clearSelection();
      setActiveChatroomId(null);
    }
  }, [isOpen, clearSelection]);

  const handleSelectChatroom = (chatroomId: string) => {
    setActiveChatroomId(chatroomId);
  };

  if (!isOpen) return null;

  return (
    <>

      {/* Active Chatroom Modal */}
      {chatrooms.length > 0 && activeChatroomId && (
        <ChallengeChatModal
          open={isOpen}
          onOpenChange={onOpenChange}
          challengeId={activeChatroomId}
          challengeName={chatrooms.find(r => r.id === activeChatroomId)?.name || 'Chat'}
          participantCount={chatrooms.find(r => r.id === activeChatroomId)?.participantCount || 0}
          challengeParticipants={chatrooms.find(r => r.id === activeChatroomId)?.participantIds || []}
        />
      )}
    </>
  );
};
