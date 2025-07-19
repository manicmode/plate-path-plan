
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Volume2, VolumeX, Pin, Crown, MessageCircle, Users, Clock } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/auth';
import { useChatModal } from '@/contexts/ChatModalContext';
import { MessageInputWithTagging } from './MessageInputWithTagging';
import { MessageBubbleWithTags } from './MessageBubbleWithTags';
import { ChatroomSelector } from './ChatroomSelector';
import { useSimplifiedChallenge } from '@/contexts/SimplifiedChallengeContext';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChallengeChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  challengeName: string;
  participantCount?: number;
  challengeParticipants?: string[];
  showChatroomSelector?: boolean;
}

export const ChallengeChatModal = ({ 
  open, 
  onOpenChange, 
  challengeId, 
  challengeName,
  participantCount = 0,
  challengeParticipants = [],
  showChatroomSelector = true
}: ChallengeChatModalProps) => {
  const { chats, sendMessage, toggleMute, canSendEmoji, getLastEmojiTime, loadMessages } = useChat();
  const { user } = useAuth();
  const { challenges, microChallenges, activeUserChallenges } = useSimplifiedChallenge();
  const { setIsChatModalOpen } = useChatModal();
  const [message, setMessage] = useState('');
  const [emojiCooldownTime, setEmojiCooldownTime] = useState(0);
  const [activeChatroomId, setActiveChatroomId] = useState(challengeId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const chat = chats[activeChatroomId];

  // Update chat modal state in context when modal opens/closes
  useEffect(() => {
    setIsChatModalOpen(open);
    return () => {
      if (!open) {
        setIsChatModalOpen(false);
      }
    };
  }, [open, setIsChatModalOpen]);

  // Build chatrooms for selector
  const chatrooms = [];
  
  // Add public challenges where user is participating
  activeUserChallenges?.forEach(challenge => {
    if (challenge.type === 'public') {
      chatrooms.push({
        id: challenge.id,
        name: challenge.name,
        type: 'public' as const,
        participantCount: challenge.participants.length,
      });
    }
  });

  // Add micro-challenges
  microChallenges?.forEach(challenge => {
    chatrooms.push({
      id: challenge.id,
      name: challenge.name,
      type: 'public' as const,
      participantCount: challenge.participants.length,
    });
  });

  // Add private challenges where user is participating
  activeUserChallenges?.forEach(challenge => {
    if (challenge.type === 'private') {
      chatrooms.push({
        id: challenge.id,
        name: challenge.name,
        type: 'private' as const,
        participantCount: challenge.participants.length,
      });
    }
  });

  // Get current chatroom info
  const currentChatroom = chatrooms.find(room => room.id === activeChatroomId);
  const displayName = currentChatroom?.name || challengeName;
  const displayCount = currentChatroom?.participantCount || participantCount;

  // Load messages when modal opens or chatroom changes
  useEffect(() => {
    if (open && activeChatroomId) {
      loadMessages(activeChatroomId);
    }
  }, [open, activeChatroomId, loadMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const el = document.getElementById('chat-scroll-container');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [chat?.messages?.length]);

  // Emoji cooldown timer
  useEffect(() => {
    if (!open || canSendEmoji(activeChatroomId)) {
      setEmojiCooldownTime(0);
      return;
    }

    const interval = setInterval(() => {
      const lastTime = getLastEmojiTime(activeChatroomId);
      const cooldownEnd = lastTime + 10000; // 10 seconds
      const remaining = Math.max(0, cooldownEnd - Date.now());
      
      setEmojiCooldownTime(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [open, activeChatroomId, getLastEmojiTime, canSendEmoji]);

  // Handle message send with tagging
  const handleSendMessage = (messageText: string, taggedUsers?: string[]) => {
    if (messageText.trim()) {
      sendMessage(activeChatroomId, messageText, undefined, taggedUsers);
      setMessage('');
    }
  };

  // Handle emoji reactions
  const handleEmojiClick = (emoji: string) => {
    if (canSendEmoji(activeChatroomId)) {
      sendMessage(activeChatroomId, undefined, emoji);
    }
  };

  // Handle tag click (show user profile)
  const handleTagClick = (userId: string) => {
    // TODO: Implement user profile modal
    console.log('Show profile for user:', userId);
  };

  // Handle join challenge for tagged user
  const handleJoinChallenge = (userId: string) => {
    // TODO: Implement challenge invitation
    console.log('Invite user to challenge:', userId);
  };

  const handleChatroomSelect = (chatroomId: string) => {
    setActiveChatroomId(chatroomId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[600px] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-4 border-b bg-muted/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <div>
                <DialogTitle className="text-lg">{displayName}</DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {displayCount} participants
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Chatroom Selector */}
              {showChatroomSelector && chatrooms.length > 1 && (
                <ChatroomSelector
                  chatrooms={chatrooms}
                  activeChatroomId={activeChatroomId}
                  onSelectChatroom={handleChatroomSelect}
                />
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleMute(activeChatroomId)}
                className="h-8 w-8 p-0"
              >
                {chat?.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Pinned Message */}
        {chat?.pinnedMessage && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-800 flex-shrink-0">
            <div className="flex items-start gap-2">
              <Pin className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {chat.pinnedMessage.text}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Pinned by {chat.pinnedMessage.author}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages Container - Fixed height with proper scroll */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2" id="chat-scroll-container">
          {(!chat?.messages || chat.messages.length === 0) ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No messages yet</p>
              <p className="text-sm text-muted-foreground">Be the first to share or tag friends!</p>
            </div>
          ) : (
            <>
              {chat.messages.map((msg) => (
                <MessageBubbleWithTags
                  key={msg.id}
                  message={msg}
                  isCurrentUser={msg.userId === user?.id}
                  onTagClick={handleTagClick}
                  onJoinChallenge={handleJoinChallenge}
                  challengeParticipants={challengeParticipants}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Emoji Cooldown Indicator */}
        {emojiCooldownTime > 0 && (
          <div className="px-4 py-2 bg-muted/50 border-t flex-shrink-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              Emoji cooldown: {Math.ceil(emojiCooldownTime / 1000)}s
            </div>
          </div>
        )}

        {/* Message Input with Tagging - Fixed at bottom */}
        <div className="flex-shrink-0">
          <MessageInputWithTagging
            value={message}
            onChange={(value) => setMessage(value)}
            onSend={handleSendMessage}
            onEmojiClick={handleEmojiClick}
            placeholder="Type a message or @ to tag friends..."
            disabled={chat?.isMuted}
            showEmojiReactions={canSendEmoji(activeChatroomId)}
            useSmartRecommendations={true}
            excludeUserIds={challengeParticipants || []}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
