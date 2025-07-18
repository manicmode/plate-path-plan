import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  MessageCircle, 
  Send, 
  Pin, 
  Volume2, 
  VolumeX,
  Clock,
  Users
} from 'lucide-react';
import { useChat, type ChatMessage } from '@/contexts/ChatContext';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface ChallengeChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  challengeName: string;
  participantCount: number;
}

const quickEmojis = ['🔥', '💪', '😅', '😂', '👏', '🎉', '❤️', '🚀'];
const reactionEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export function ChallengeChatModal({ 
  open, 
  onOpenChange, 
  challengeId, 
  challengeName,
  participantCount 
}: ChallengeChatModalProps) {
  const { 
    chats, 
    sendMessage, 
    addReaction, 
    removeReaction, 
    toggleMute, 
    canSendEmoji, 
    getLastEmojiTime 
  } = useChat();
  
  const [message, setMessage] = useState('');
  const [emojiCooldownTime, setEmojiCooldownTime] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chat = chats[challengeId];
  const messages = chat?.messages || [];
  const pinnedMessage = chat?.pinnedMessage;
  const isMuted = chat?.isMuted || false;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages.length]);

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

  // Focus input when modal opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessage(challengeId, message.trim());
      setMessage('');
    }
  };

  const handleSendEmoji = (emoji: string) => {
    if (canSendEmoji(challengeId)) {
      sendMessage(challengeId, '', emoji);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleReaction = (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId);
    const userReacted = message?.reactions?.[emoji]?.includes('current-user-id');
    
    if (userReacted) {
      removeReaction(challengeId, messageId, emoji);
    } else {
      addReaction(challengeId, messageId, emoji);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return format(date, 'HH:mm');
    } else {
      return format(date, 'MMM d, HH:mm');
    }
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
                  {participantCount} participants
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleMute(challengeId)}
              className="h-8 w-8 p-0"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </DialogHeader>

        {/* Pinned Message */}
        {pinnedMessage && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-2">
              <Pin className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {pinnedMessage.text}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Pinned by {pinnedMessage.author}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground">Be the first to share!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onReaction={handleReaction}
                />
              ))
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

        {/* Quick Emoji Reactions */}
        <div className="p-3 border-t bg-muted/20">
          <div className="flex flex-wrap gap-2 mb-3">
            {quickEmojis.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 w-8 p-0 hover:scale-110 transition-transform",
                  !canSendEmoji(challengeId) && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleSendEmoji(emoji)}
                disabled={!canSendEmoji(challengeId)}
              >
                {emoji}
              </Button>
            ))}
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 140))}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!message.trim()}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Character Counter */}
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {message.length}/140
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  onReaction: (messageId: string, emoji: string) => void;
}

function MessageBubble({ message, onReaction }: MessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false);
  const isCurrentUser = message.userId === 'current-user-id';
  const isEmojiOnly = !message.text && message.emoji;

  return (
    <div className={cn(
      "flex gap-3",
      isCurrentUser ? "flex-row-reverse" : "flex-row"
    )}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs">{message.avatar}</AvatarFallback>
        </Avatar>
      )}
      
      <div className={cn(
        "flex flex-col gap-1 max-w-[75%]",
        isCurrentUser ? "items-end" : "items-start"
      )}>
        {!isCurrentUser && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{message.username}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
            </span>
          </div>
        )}
        
        <div
          className={cn(
            "relative group",
            isEmojiOnly && "text-3xl p-1",
            !isEmojiOnly && cn(
              "px-3 py-2 rounded-2xl",
              isCurrentUser 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted"
            )
          )}
          onMouseEnter={() => setShowReactions(true)}
          onMouseLeave={() => setShowReactions(false)}
        >
          {message.emoji && !message.text ? (
            <span className="text-3xl">{message.emoji}</span>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">
              {message.text}
            </p>
          )}

          {/* Reaction Button */}
          {showReactions && !isEmojiOnly && (
            <div className={cn(
              "absolute -bottom-8 flex gap-1 p-1 bg-background border rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10",
              isCurrentUser ? "right-0" : "left-0"
            )}>
              {reactionEmojis.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-xs hover:scale-125 transition-transform"
                  onClick={() => onReaction(message.id, emoji)}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Message Reactions */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {Object.entries(message.reactions).map(([emoji, userIds]) => {
              if (!userIds || userIds.length === 0) return null;
              
              const userReacted = userIds.includes('current-user-id');
              
              return (
                <Badge
                  key={emoji}
                  variant={userReacted ? "default" : "secondary"}
                  className={cn(
                    "text-xs px-2 py-0.5 cursor-pointer hover:scale-105 transition-transform",
                    userReacted && "bg-primary/20 text-primary border-primary/30"
                  )}
                  onClick={() => onReaction(message.id, emoji)}
                >
                  {emoji} {userIds.length}
                </Badge>
              );
            })}
          </div>
        )}

        {isCurrentUser && (
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
          </span>
        )}
      </div>
    </div>
  );
}