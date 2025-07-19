
import { useState, useEffect } from 'react';
import { ChallengeChatModal } from './ChallengeChatModal';
import { ChatroomSelector } from './ChatroomSelector';
import { useActiveChallenges } from '@/contexts/OptimizedChallengeProvider';

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
  const { userChallenges, loading } = useActiveChallenges();
  const [activeChatroomId, setActiveChatroomId] = useState<string | null>(null);
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);

  // Build chatrooms list from user's challenge participations
  useEffect(() => {
    if (loading) return;

    console.log('Building chatrooms from user challenges:', userChallenges);

    const availableChatrooms: Chatroom[] = [];

    // Add all user challenges as chatrooms
    userChallenges?.forEach(challenge => {
      console.log('Adding chatroom for challenge:', challenge);
      
      availableChatrooms.push({
        id: challenge.id,
        name: challenge.name,
        type: challenge.type === 'private' ? 'private' : 'public',
        participantCount: challenge.participants?.length || 0,
        participantIds: challenge.participants || [],
      });
    });

    console.log('Final available chatrooms:', availableChatrooms);
    setChatrooms(availableChatrooms);

    // Auto-select first chatroom if none selected
    if (availableChatrooms.length > 0 && !activeChatroomId) {
      setActiveChatroomId(availableChatrooms[0].id);
    }
  }, [userChallenges, activeChatroomId, loading]);

  const handleSelectChatroom = (chatroomId: string) => {
    setActiveChatroomId(chatroomId);
  };

  const activeChatroom = chatrooms.find(room => room.id === activeChatroomId);

  if (!isOpen) return null;

  // Show loading state
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span>Loading your challenges...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show message if no chatrooms available
  if (chatrooms.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-background rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-2">No Active Challenges</h3>
          <p className="text-muted-foreground mb-4">
            You need to join some challenges to access group chats. Head to the challenges section to get started!
          </p>
          <button 
            onClick={() => onOpenChange(false)}
            className="w-full bg-primary text-primary-foreground rounded-md py-2"
          >
            Close
          </button>
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
