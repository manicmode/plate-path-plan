import React, { useEffect, useRef, useCallback, useState } from 'react';
import { MessageCircle, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useChallengeMessages } from '@/hooks/useChallengeMessages';
import ChatComposer from '@/components/analytics/chat/ChatComposer';

interface ChallengeChatPanelProps {
  challengeId: string;
  challengeName?: string;
  participantCount?: number;
  roomType?: 'public' | 'private';
  showHeader?: boolean;
}

export const ChallengeChatPanel: React.FC<ChallengeChatPanelProps> = ({
  challengeId,
  challengeName = 'Chat',
  participantCount = 0,
  roomType = 'public',
  showHeader = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const [composerH, setComposerH] = useState(180); // fallback
  const [bottomNavH, setBottomNavH] = useState(96); // fallback
  const [padBottom, setPadBottom] = useState(180);
  const stickRef = useRef(true);

  // SINGLE SOURCE: only this hook
  const { messages, isLoading, error, sendMessage } = useChallengeMessages(challengeId, roomType);

  useEffect(() => {
    console.info('[chat] panel challengeId=', challengeId);
  }, [challengeId]);

  // Measure bottom nav once (so composer can sit above it)
  useEffect(() => {
    const nav = document.querySelector('[data-bottom-nav]') as HTMLElement | null;
    const h = nav?.offsetHeight ?? 96;
    setBottomNavH(h);
    // expose var so ChatComposer can use it in its bottom calc
    document.documentElement.style.setProperty('--bottom-nav-h', `${h}px`);
  }, []);

  // Observe composer height so messages never hide behind it
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const h = Math.ceil(entry.contentRect.height);
      setComposerH(h);
      setPadBottom(h + 16);
      document.documentElement.style.setProperty('--composer-h', `${h}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleSend = useCallback(async (text: string) => {
    console.info('[panel] onSend', { challengeId, textLen: text.trim().length });
    try {
      await sendMessage(text);
      console.info('[panel] send ok');
    } catch (e) {
      console.error('[panel] send error', e);
    }
  }, [challengeId, sendMessage]);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 140;
  }, []);

  const onScroll = useCallback(() => {
    stickRef.current = isNearBottom();
  }, [isNearBottom]);

  // Auto-scroll to bottom when new messages arrive if user was near bottom
  useEffect(() => {
    if (!stickRef.current) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ block: 'end' });
      })
    );
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

      <div
        id="chat-inline-scroll"
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto px-4 pt-2"
        style={{
          paddingTop: 'var(--chat-header-h, 0px)',
          paddingBottom: `calc(env(safe-area-inset-bottom) + var(--bottom-nav-h, 88px) + ${padBottom}px)`,
          scrollPaddingTop: 'var(--chat-header-h, 0px)',
          scrollPaddingBottom: 'calc(var(--composer-h, 160px) + 24px)',
          scrollBehavior: 'smooth',
          overscrollBehavior: 'contain',
        }}
      >
        {isLoading ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Loading messages...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
            <p className="text-red-400">Error loading messages</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No messages yet</p>
            <p className="text-sm text-muted-foreground">Be the first to share or tag friends!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isOptimistic = msg.pending || String(msg.id ?? '').startsWith('temp-');
              return (
                <div
                  key={String(msg.id ?? msg.tempId)}
                  className={`flex gap-3 mb-4 ${isOptimistic ? 'opacity-70' : ''}`}
                >
                  <div className="flex flex-col">
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      {isOptimistic && ' (sending...)'}
                    </div>
                    <div className="rounded-lg px-3 py-2 max-w-xs break-words bg-muted">
                      <div className="text-sm">{msg.content}</div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={endRef} />
          </>
        )}
      </div>

      <div ref={composerRef} className="flex-shrink-0">
        <ChatComposer onSend={handleSend} disabled={!!error} />
      </div>
    </section>
  );
};
