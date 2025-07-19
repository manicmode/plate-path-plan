
import { useState, useEffect } from 'react';
import { ChallengeChatModal } from './ChallengeChatModal';
import { ChatroomSelector } from './ChatroomSelector';
import { useChallenge } from '@/contexts/ChallengeContext';

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
}

export const ChatroomManager = ({ isOpen, onOpenChange }: ChatroomManagerProps) => {
  const { challenges, microChallenges, activeUserChallenges } = useChallenge();
  const [activeChatroomId, setActiveChatroomId] = useState<string | null>(null);
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);

  // Build chatrooms list from user's challenge participations
  useEffect(() => {
    const availableChatrooms: Chatroom[] = [];

    // Add public challenges the user is participating in
    activeUserChallenges?.forEach(challenge => {
      if (challenge.type === 'public') {
        availableChatrooms.push({
          id: challenge.id,
          name: challenge.name,
          type: 'public',
          participantCount: challenge.participants.length,
          participantIds: challenge.participants,
        });
      }
    });

    // Add micro-challenges (treating them as mini chatrooms)
    microChallenges?.forEach(challenge => {
      availableChatrooms.push({
        id: challenge.id,
        name: challenge.name,
        type: 'public',
        participantCount: challenge.participants.length,
        participantIds: challenge.participants,
      });
    });

    // Add private challenges the user is participating in
    activeUserChallenges?.forEach(challenge => {
      if (challenge.type === 'private') {
        availableChatrooms.push({
          id: challenge.id,
          name: challenge.name,
          type: 'private',
          participantCount: challenge.participants.length,
          participantIds: challenge.participants,
        });
      }
    });

    setChatrooms(availableChatrooms);

    // Auto-select first chatroom if none selected
    if (availableChatrooms.length > 0 && !activeChatroomId) {
      setActiveChatroomId(availableChatrooms[0].id);
    }
  }, [challenges, microChallenges, activeUserChallenges, activeChatroomId]);

  const handleSelectChatroom = (chatroomId: string) => {
    setActiveChatroomId(chatroomId);
  };

  const activeChatroom = chatrooms.find(room => room.id === activeChatroomId);

  if (!isOpen) return null;

  return (
    <>
      {/* Chatroom Selector - positioned in top-right corner of dialog */}
      <div className="fixed top-4 right-4 z-50">
        <ChatroomSelector
          chatrooms={chatrooms}
          activeChatroomId={activeChatroomId || undefined}
          onSelectChatroom={handleSelectChatroom}
        />
      </div>

      {/* Active Chatroom Modal */}
      {activeChatroom && (
        <ChallengeChatModal
          open={isOpen}
          onOpenChange={onOpenChange}
          challengeId={activeChatroom.id}
          challengeName={activeChatroom.name}
          participantCount={activeChatroom.participantCount}
          challengeParticipants={activeChatroom.participantIds || []}
        />
      )}
    </>
  );
};
