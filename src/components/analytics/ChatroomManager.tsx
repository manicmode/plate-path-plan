
import { useState, useEffect } from 'react';
import { ChallengeChatModal } from './ChallengeChatModal';
import { ChatroomSelector } from './ChatroomSelector';
import { usePublicChallenges } from '@/hooks/usePublicChallenges';
import { usePrivateChallenges } from '@/hooks/usePrivateChallenges';

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
  const { 
    userParticipations: publicParticipations, 
    challenges: publicChallenges, 
    loading: publicLoading 
  } = usePublicChallenges();
  
  const { 
    userActiveChallenges: privateChallenges, 
    loading: privateLoading 
  } = usePrivateChallenges();

  const [activeChatroomId, setActiveChatroomId] = useState<string | null>(null);
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);

  // Build chatrooms list from user's challenge participations
  useEffect(() => {
    if (publicLoading || privateLoading) return;

    const availableChatrooms: Chatroom[] = [];

    // Add public challenges the user is participating in
    publicParticipations?.forEach(participation => {
      const challenge = publicChallenges?.find(c => c.id === participation.challenge_id);
      if (challenge) {
        availableChatrooms.push({
          id: challenge.id,
          name: challenge.title,
          type: 'public',
          participantCount: challenge.participant_count,
          participantIds: [], // Public challenges don't expose participant IDs
        });
      }
    });

    // Add private challenges the user is participating in
    privateChallenges?.forEach(challenge => {
      availableChatrooms.push({
        id: challenge.id,
        name: challenge.title,
        type: 'private',
        participantCount: challenge.invited_user_ids.length + 1, // Include creator
        participantIds: [...challenge.invited_user_ids, challenge.creator_id],
      });
    });

    setChatrooms(availableChatrooms);

    // Auto-select first chatroom if none selected
    if (availableChatrooms.length > 0 && !activeChatroomId) {
      setActiveChatroomId(availableChatrooms[0].id);
    }
  }, [publicChallenges, privateChallenges, publicParticipations, activeChatroomId, publicLoading, privateLoading]);

  const handleSelectChatroom = (chatroomId: string) => {
    setActiveChatroomId(chatroomId);
  };

  const activeChatroom = chatrooms.find(room => room.id === activeChatroomId);

  if (!isOpen) return null;

  // Show loading state if data is still being fetched
  if (publicLoading || privateLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading chatrooms...</p>
        </div>
      </div>
    );
  }

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
