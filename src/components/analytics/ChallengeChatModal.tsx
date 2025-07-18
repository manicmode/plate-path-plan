import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Volume2, VolumeX, Pin, Crown, MessageCircle, Users, Clock } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/auth';
import { MessageInputWithTagging } from './MessageInputWithTagging';
import { MessageBubbleWithTags } from './MessageBubbleWithTags';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChallengeChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  challengeName: string;
  participantCount?: number;
  challengeParticipants?: string[];
}

export const ChallengeChatModal = ({ 
  open, 
  onOpenChange, 
  challengeId, 
  challengeName,
  participantCount = 0,
  challengeParticipants = []
}: ChallengeChatModalProps) => {
  const { chats, sendMessage, toggleMute, canSendEmoji, getLastEmojiTime, loadMessages } = useChat();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [emojiCooldownTime, setEmojiCooldownTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const chat = chats[challengeId];

  // Load messages when modal opens
  useEffect(() => {
    if (open) {
      loadMessages(challengeId);
    }
  }, [open, challengeId, loadMessages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [chat?.messages?.length]);

  // Emoji cooldown timer
  useEffect(() => {
    if (!open || canSendEmoji(challengeId)) {
      setEmojiCooldownTime(0);
      return;
    }

    const interval = setInterval(() => {
      const lastTime = getLastEmojiTime(challengeId);
      const cooldownEnd = lastTime + 10000; // 10 seconds
      const remaining = Math.max(0, cooldownEnd - Date.now());
      
      setEmojiCooldownTime(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [open, challengeId, getLastEmojiTime, canSendEmoji]);

  // Handle message send with tagging
  const handleSendMessage = (messageText: string, taggedUsers?: string[]) => {
    if (messageText.trim()) {
      sendMessage(challengeId, messageText, undefined, taggedUsers);
      setMessage('');
    }
  };

  // Handle emoji reactions
  const handleEmojiClick = (emoji: string) => {
    if (canSendEmoji(challengeId)) {
      sendMessage(challengeId, undefined, emoji);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[600px] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-5 w-5 text-primary" />
              <div>
                <DialogTitle className="text-lg">{challengeName}</DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-3 w-3" />
                  {participantCount || challengeParticipants.length} participants
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleMute(challengeId)}
                className="h-8 w-8 p-0"
              >
                {chat?.isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Pinned Message */}
        {chat?.pinnedMessage && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-800">
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

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
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
        </ScrollArea>

        {/* Emoji Cooldown Indicator */}
        {emojiCooldownTime > 0 && (
          <div className="px-4 py-2 bg-muted/50 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              Emoji cooldown: {Math.ceil(emojiCooldownTime / 1000)}s
            </div>
          </div>
        )}

        {/* Message Input with Tagging */}
        <MessageInputWithTagging
          value={message}
          onChange={(value) => setMessage(value)}
          onSend={handleSendMessage}
          onEmojiClick={handleEmojiClick}
          placeholder="Type a message or @ to tag friends..."
          disabled={chat?.isMuted}
          showEmojiReactions={canSendEmoji(challengeId)}
          useSmartRecommendations={true}
          excludeUserIds={challengeParticipants || []}
        />
      </DialogContent>
    </Dialog>
  );
};