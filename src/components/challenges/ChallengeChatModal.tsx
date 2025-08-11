import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth';

interface ChallengeChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  challengeName: string;
  participantCount: number;
  challengeParticipants: any[];
  showChatroomSelector?: boolean;
  isPublic?: boolean;
  isParticipating?: boolean;
}

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  time: string;
  reactions?: string[];
}

export const ChallengeChatModal: React.FC<ChallengeChatModalProps> = ({
  open,
  onOpenChange,
  challengeId,
  challengeName,
  participantCount,
  challengeParticipants,
  showChatroomSelector = false,
  isPublic = false,
  isParticipating = false
}) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      user: 'System',
      message: `Welcome to ${challengeName} chat!`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: []
    }
  ]);

  // Chat functionality enabled if public OR user is participating in private
  const canChat = isPublic || isParticipating;

  const sendMessage = () => {
    if (!message.trim() || !canChat) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: user?.email?.split('@')[0] || 'You',
      message: message.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reactions: []
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl h-[80vh] flex flex-col"
        data-testid="chat-modal"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            {challengeName}
            <Badge variant="outline" className="ml-auto">
              {participantCount} participants
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Messages */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="flex gap-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {msg.user[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{msg.user}</span>
                      <span className="text-xs text-muted-foreground">{msg.time}</span>
                    </div>
                    <p className="text-sm break-words">{msg.message}</p>
                    {msg.reactions && msg.reactions.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {msg.reactions.map((reaction, idx) => (
                          <span key={idx} className="text-xs">
                            {reaction}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="flex-shrink-0 border-t pt-4">
            {canChat ? (
              <div className="flex gap-2">
                <Input
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  {isPublic 
                    ? "Chat is available to all users in public challenges" 
                    : "Join this private challenge to participate in chat"
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};