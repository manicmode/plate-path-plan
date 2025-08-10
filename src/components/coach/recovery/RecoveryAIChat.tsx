import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/auth';
import { useCoachInteractions } from '@/hooks/useCoachInteractions';
import { supabase } from '@/integrations/supabase/client';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { scrollToAlignTop, settleAndPinTop } from '@/utils/scroll';

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export const RecoveryAIChat = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `Hello dear soul... 🌙 I'm your gentle recovery guide. In this space of calm and healing, I'm here to nurture your mind, body, and spirit with compassion 💫

Take a slow, deep breath with me... Let's journey together toward deeper rest, peaceful restoration, and serene wellness. What area of your beautiful recovery would you like to explore today? 🧘‍♀️✨`,
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useMyData, setUseMyData] = useState(true);
  const [isContextLoading, setIsContextLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const pendingPinMsgIdRef = useRef<string | null>(null);

  // 🎮 Coach Gamification System
  const { trackInteraction } = useCoachInteractions();

  useEffect(() => {
    const root = scrollAreaRef.current as HTMLElement | null;
    const scroller = (root?.querySelector?.('[data-radix-scroll-area-viewport]') as HTMLDivElement) || root;
    if (!scroller) return;
    scroller.setAttribute('data-chat-scroll-area', '');
    // Do not auto-scroll to bottom on new messages; we'll pin user message to top instead
  }, [messages]);

  // Align chat to top on chip taps or programmatic requests
  useEffect(() => {
    const cb = () => scrollToAlignTop(chatContainerRef.current, { reassertDelayMs: 140 });
    window.addEventListener('coach:scrollToChat', cb as any);
    return () => window.removeEventListener('coach:scrollToChat', cb as any);
  }, []);

  // Listen for programmatic sends from SkillPanel/CommandBar
  useEffect(() => {
    const handler = (e: Event) => {
      // Ensure chat is aligned before sending
      scrollToAlignTop(chatContainerRef.current, { reassertDelayMs: 140 });
      const raw = (e as CustomEvent).detail as any;
      let text = '' as string;
      let chipId: string | undefined = undefined;
      if (typeof raw === 'string') {
        text = raw;
        chipId = 'unknown';
      } else if (raw && typeof raw === 'object') {
        text = raw.text || '';
        chipId = raw.chipId;
      }
      if (!text) return;
      if (chipId) {
        
      }
      sendMessage(text);
    };
    window.addEventListener('recovery-chat:send', handler as EventListener);
    return () => window.removeEventListener('recovery-chat:send', handler as EventListener);
  }, [useMyData]);

  const fetchContextIfNeeded = async () => {
    if (!useMyData) return null;
    setIsContextLoading(true);
    const start = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('coach-context', {} as any);
      if (error) throw error;
      return data;
    } catch (err) {
      console.warn('coach-context failed, fallback to generic', err);
      return null;
    } finally {
      const elapsed = Date.now() - start;
      const minDelay = 300; // subtle shimmer
      const remaining = Math.max(0, minDelay - elapsed);
      setTimeout(() => setIsContextLoading(false), remaining);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const messageToSend = messageText || input.trim();
    if (!messageToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageToSend,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    pendingPinMsgIdRef.current = userMessage.id;
    setInput('');
    setIsLoading(true);

    // 🎮 Coach Gamification System - Track message interaction
    await trackInteraction('recovery', 'message');

    try {
      const context = await fetchContextIfNeeded();
      const { data, error } = await supabase.functions.invoke('ai-coach-chat', {
        body: {
          coachType: 'recovery',
          message: messageToSend,
          useContext: useMyData,
          userContext: {
            voiceProfile: 'calm_serene',
            coachType: 'recovery',
            context,
          },
        },
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        isUser: false,
        timestamp: new Date(),
      };

      if (useMyData && !context) {
        setMessages(prev => [...prev, { id: (Date.now() + 0.5).toString(), content: 'Using general guidance; log more workouts/meals/recovery to personalize.', isUser: false, timestamp: new Date() }]);
      }

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const friendly = (error && typeof error.message === 'string') ? error.message : 'Using a generic answer; I’ll personalize once your data loads.';
      const genericMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: friendly,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, genericMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useLayoutEffect(() => {
    const id = pendingPinMsgIdRef.current;
    if (!id) return;
    const root = scrollAreaRef.current as HTMLElement | null;
    const scroller = (root?.querySelector?.('[data-radix-scroll-area-viewport]') as HTMLElement) || root;
    if (!scroller) return;
    scroller.setAttribute('data-chat-scroll-area', '');
    const node = scroller.querySelector<HTMLElement>(`[data-msg-id="${id}"][data-role="user"]`);
    if (!node) return;
    settleAndPinTop(scroller, node, { reassertMs: 160 });
    pendingPinMsgIdRef.current = null;
    node.querySelectorAll('img').forEach(img => {
      img.addEventListener('load', () => settleAndPinTop(scroller, node, { reassertMs: 160 }), { once: true });
    });
  }, [messages]);

  return (
    <Card ref={chatContainerRef} className="glass-card border-0 rounded-3xl">
      <CardHeader className={`${isMobile ? 'pb-3' : 'pb-4'}`}>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center space-x-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
            <Sparkles className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'} text-orange-500`} />
            <span>Chat with Your Coach</span>
          </CardTitle>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-xs">Use my data</span>
            <input
              type="checkbox"
              checked={useMyData}
              onChange={(e) => setUseMyData(e.target.checked)}
              className="accent-current"
              aria-label="Use my data"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className={`${isMobile ? 'p-4' : 'p-6'} pt-0`}>
        {/* Messages Container with optimized height for mobile */}
        <div className={`${isMobile ? 'h-[500px]' : 'h-[600px]'} flex flex-col`}>
          <ScrollArea className="flex-1 px-3 w-full" ref={scrollAreaRef}>
            <div className="space-y-4 py-2">
              {isContextLoading && (
                <div className="text-xs text-muted-foreground">Personalizing with your data…</div>
              )}
              {messages.map((message) => (
                <div key={message.id}>
                  <div
                    className={`flex items-start space-x-3 w-full ${
                      message.isUser ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.isUser
                          ? 'bg-pink-500 text-white'
                          : 'bg-orange-500 text-white'
                      }`}
                    >
                      {message.isUser ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    <div
                      data-msg-id={message.id}
                      data-role={message.isUser ? 'user' : 'assistant'}
                        className={`flex-1 p-3 rounded-2xl break-words ${
                          message.isUser
                            ? 'bg-pink-500 text-white max-w-[80%] ml-auto'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white max-w-[85%]'
                        }`}
                      style={{ 
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word'
                      }}
                    >
                      <p className={`${isMobile ? 'text-sm' : 'text-base'} leading-relaxed whitespace-pre-wrap`}>
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start space-x-3 w-full">
                  <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                      <p className={`${isMobile ? 'text-sm' : 'text-base'} text-gray-600 dark:text-gray-300`}>
                        Thinking...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className={`flex flex-col gap-2 mt-4`}>
          <div className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className="flex-1 rounded-2xl"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="sm"
              className="bg-orange-500 hover:bg-orange-600 rounded-2xl px-4"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {!useMyData && (
            <div className="text-xs text-muted-foreground pl-1">Personalization off — generic guidance only.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};