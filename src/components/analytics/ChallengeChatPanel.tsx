import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Users, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useChallengeMessages } from '@/hooks/useChallengeMessages';
import { MessageInputWithTagging } from './MessageInputWithTagging';

interface ChallengeChatPanelProps {
  challengeId: string;
  challengeName?: string;
  participantCount?: number;
  isPublic?: boolean;
}

export const ChallengeChatPanel: React.FC<ChallengeChatPanelProps> = ({
  challengeId,
  challengeName = 'Chat',
  participantCount = 0,
}) => {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, sendMessage: sendChatMessage } = useChallengeMessages(challengeId);

  const handleSendMessage = async (text: string) => {
    if (text.trim()) {
      await sendChatMessage(text);
      setMessage('');
    }
  };

  useEffect(() => {
    const el = document.getElementById('chat-inline-scroll');
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <section aria-label="Challenge chat" className="w-full">
      {/* Header */}
      <header className="p-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-base font-semibold leading-none">{challengeName}</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-3 w-3" />
              {participantCount} participants
            </div>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div id="chat-inline-scroll" className="flex-1 overflow-y-auto px-4 py-2 space-y-2 pb-[90px] md:pb-[120px]">
        {isLoading ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">Be the first to share or tag friends!</p>
          </div>
        ) : (
          <>
            {messages.map((msg: any) => (
              <div key={msg.id} className="flex gap-3">
                <div className="flex flex-col">
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </div>
                  <div className="rounded-lg px-3 py-2 max-w-xs break-words bg-muted">
                    <div className="text-sm">{msg.content}</div>
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <MessageInputWithTagging
          value={message}
          onChange={(value) => setMessage(value)}
          onSend={handleSendMessage}
          onEmojiClick={async (emoji) => {
            if (emoji) await handleSendMessage(emoji);
          }}
          placeholder="Type a message or @ to tag friends..."
          showEmojiReactions={true}
          excludeUserIds={[]}
        />
      </div>
    </section>
  );
};
