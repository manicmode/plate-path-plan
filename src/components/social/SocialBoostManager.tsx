import React, { useState, useEffect } from 'react';
import { FriendConnectionModal } from './FriendConnectionModal';
import { useSocialBoosts } from '@/hooks/useSocialBoosts';

interface SocialBoostManagerProps {
  children: React.ReactNode;
}

export const SocialBoostManager: React.FC<SocialBoostManagerProps> = ({ children }) => {
  const [connectionModal, setConnectionModal] = useState<{
    isOpen: boolean;
    friendName: string;
    friendId: string;
  }>({
    isOpen: false,
    friendName: '',
    friendId: '',
  });

  const { handleFriendRequestAccepted } = useSocialBoosts();

  // This would be called by your existing friend request system
  const handleFriendRequestAcceptedEvent = async (friendId: string, friendName: string) => {
    const result = await handleFriendRequestAccepted(friendId, friendName);
    
    if (result.showModal && result.friendName && result.friendId) {
      setConnectionModal({
        isOpen: true,
        friendName: result.friendName,
        friendId: result.friendId,
      });
    }
  };

  const closeConnectionModal = () => {
    setConnectionModal({
      isOpen: false,
      friendName: '',
      friendId: '',
    });
  };

  // Expose the function globally for integration with existing friend system
  useEffect(() => {
    // You can attach this to window or use a context/event system
    (window as any).triggerFriendConnectionModal = handleFriendRequestAcceptedEvent;
    
    return () => {
      delete (window as any).triggerFriendConnectionModal;
    };
  }, []);

  return (
    <>
      {children}
      
      <FriendConnectionModal
        isOpen={connectionModal.isOpen}
        onClose={closeConnectionModal}
        friendName={connectionModal.friendName}
        friendId={connectionModal.friendId}
      />
    </>
  );
};