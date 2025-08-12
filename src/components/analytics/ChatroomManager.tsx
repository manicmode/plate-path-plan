
import { useState, useEffect, useMemo } from 'react';
import { ChallengeChatModal } from './ChallengeChatModal';
import { useMyChallenges } from '@/hooks/useMyChallenges';
import { useChatStore } from '@/store/chatStore';
import { MessageCircle } from 'lucide-react';

interface ChatroomManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  initialChatroomId?: string;
}

export const ChatroomManager = ({ isOpen, onOpenChange, initialChatroomId }: ChatroomManagerProps) => {
  const { data: myChallenges, isLoading } = useMyChallenges();
  const { selectedChatroomId, selectChatroom, clearSelection } = useChatStore();
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);

  const rooms = useMemo(() => (myChallenges ?? []).map(c => ({
    id: c.id,
    name: c.title,
    type: (c.visibility === 'public' ? 'public' : 'private') as 'public' | 'private',
    participantCount: c.participant_count || 0
  })), [myChallenges]);

  // QA logs
  console.info('[chat] activeIds', (myChallenges ?? []).map(c => c.id));
  console.info('[chat] rooms', rooms.map(r => r.id));

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
  if (isLoading) return <div className="p-4">Loading chatrooms...</div>;
  if (rooms.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Active Challenges</h3>
        <p className="text-muted-foreground">Join a challenge to access chat</p>
      </div>
    );
  }

  const selectedRoom = rooms.find(r => r.id === localSelectedId);

  return (
    <ChallengeChatModal
      open={true}
      onOpenChange={onOpenChange}
      challengeId={localSelectedId || rooms[0].id}
      challengeName={selectedRoom?.name || 'Chat'}
      participantCount={selectedRoom?.participantCount || 0}
      challengeParticipants={[]}
      showChatroomSelector={rooms.length > 1}
    />
  );
};
