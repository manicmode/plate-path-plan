import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MessageCircle, Users, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useChallengeMessages } from '@/hooks/useChallengeMessages';
import ChatComposer from '@/components/analytics/chat/ChatComposer';

interface ChallengeChatPanelProps {
  challengeId: string;
  challengeName?: string;
  participantCount?: number;
  isPublic?: boolean;
  showHeader?: boolean;
}

export const ChallengeChatPanel: React.FC<ChallengeChatPanelProps> = ({
  challengeId,
  challengeName = 'Chat',
  participantCount = 0,
  showHeader = true,
}) => {
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, error, sendMessage } = useChallengeMessages(challengeId);

  useEffect(() => {
    console.info('[chat] panel challengeId=', challengeId);
  }, [challengeId]);

  const handleSend = useCallback(async (text: string) => {
    console.info('[chat] panel.handleSend', { challengeId, len: text.trim().length });
    try {
      await sendMessage(text);
      console.info('[chat] panel.sendMessage ok');
    } catch (e) {
      console.error('[chat] panel.sendMessage error', e);
    }
  }, [challengeId, sendMessage]);

  const list = useMemo(() => {
    return [...(messages || [])].sort(
      (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [messages]);

  console.info('[chat] render messages', { count: list.length, challengeId });

  useEffect(() => {
    const el = document.getElementById('chat-inline-scroll');
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <section aria-label="Challenge chat" className="w-full">
      {showHeader && (
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
      )}

      {/* Messages */}
      <div
        id="chat-inline-scroll"
        className="flex-1 overflow-y-auto px-4 pt-2"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + var(--bottom-nav-h,88px) + 160px)",
        }}
      >
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
            {list.map((msg: any) => (
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

      {/* Composer */}
      <div className="flex-shrink-0">
        <ChatComposer onSend={handleSend} disabled={!!error} />
      </div>
    </section>
  );
};
