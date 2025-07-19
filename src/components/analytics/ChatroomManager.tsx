
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
  const { challenges, microChallenges, userParticipations, privateParticipations } = useChallenge();
  const [activeChatroomId, setActiveChatroomId] = useState<string | null>(null);
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);

  // Build chatrooms list from user's challenge participations
  useEffect(() => {
    const availableChatrooms: Chatroom[] = [];

    // Add public challenges the user is participating in
    userParticipations?.forEach(participation => {
      const challenge = challenges.find(c => c.id === participation.challenge_id);
      if (challenge) {
        availableChatrooms.push({
          id: challenge.id,
          name: challenge.title,
          type: 'public',
          participantCount: challenge.participant_count || 0,
          participantIds: [], // Would be populated from actual participant data
        });
      }
    });

    // Add micro-challenges (treating them as mini chatrooms)
    microChallenges?.forEach(challenge => {
      availableChatrooms.push({
        id: `micro-${challenge.id}`,
        name: challenge.title,
        type: 'public',
        participantCount: challenge.participantCount || 1,
        participantIds: challenge.participants || [],
      });
    });

    // Add private challenges the user is participating in
    privateParticipations?.forEach(participation => {
      if (participation.private_challenge) {
        availableChatrooms.push({
          id: participation.private_challenge.id,
          name: participation.private_challenge.title,
          type: 'private',
          participantCount: participation.private_challenge.max_participants || 0,
          participantIds: participation.private_challenge.invited_user_ids || [],
        });
      }
    });

    setChatrooms(availableChatrooms);

    // Auto-select first chatroom if none selected
    if (availableChatrooms.length > 0 && !activeChatroomId) {
      setActiveChatroomId(availableChatrooms[0].id);
    }
  }, [challenges, microChallenges, userParticipations, privateParticipations, activeChatroomId]);

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
