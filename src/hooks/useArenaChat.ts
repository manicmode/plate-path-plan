import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type ArenaChatMessage = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
};

export function useArenaChat(groupId?: string | null): {
  messages: ArenaChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  error?: Error;
} {
  const [messages, setMessages] = useState<ArenaChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();
  
  // Refs for cleanup and debouncing
  const channelRef = useRef<any>(null);
  const lastSendTime = useRef(0);
  const sendCount = useRef(0);
  const sendCountResetRef = useRef<NodeJS.Timeout | null>(null);
  const hasWarnedRef = useRef(false);

  // Clear messages when groupId changes
  useEffect(() => {
    setMessages([]);
    setError(undefined);
  }, [groupId]);

  // Fetch initial messages and setup realtime
  useEffect(() => {
    if (!groupId) {
      console.debug('[useArenaChat] No groupId, returning empty state');
      setMessages([]);
      setIsLoading(false);
      setError(undefined);
      return;
    }

    if (!hasWarnedRef.current) {
      console.debug('[useArenaChat] Initializing for groupId:', groupId);
      hasWarnedRef.current = true;
    }

    let mounted = true;
    setIsLoading(true);

    const initializeChat = async () => {
      try {
        // Fetch latest 100 messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('arena_chat_messages')
          .select('id, user_id, message, created_at')
          .eq('group_id', groupId)
          .order('created_at', { ascending: false })
          .limit(100);

        if (!mounted) return;

        if (messagesError) {
          console.error('[useArenaChat] Error fetching messages:', messagesError);
          setError(new Error('Failed to load chat messages'));
          return;
        }

        // Sort ascending for UI display (newest at bottom)
        const sortedMessages = (messagesData || []).reverse();
        setMessages(sortedMessages);
        console.debug('[useArenaChat] Loaded', sortedMessages.length, 'messages');

        // Setup realtime subscription
        const channel = supabase
          .channel(`arena-chat-${groupId}`)
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'arena_chat_messages',
              filter: `group_id=eq.${groupId}`,
            },
            (payload) => {
              console.debug('[useArenaChat] New message via realtime:', payload.new);
              if (mounted) {
                setMessages(prev => {
                  // Dedupe by id
                  const newMessage = payload.new as ArenaChatMessage;
                  const exists = prev.some(msg => msg.id === newMessage.id);
                  if (exists) return prev;
                  
                  // Add to end (newest messages at bottom)
                  return [...prev, newMessage];
                });
              }
            }
          )
          .subscribe(async (status) => {
            console.debug('[useArenaChat] Realtime status:', status);
            const { ArenaEvents } = await import('@/lib/telemetry');
            ArenaEvents.chatSubscribe(status === 'SUBSCRIBED', groupId);
          });

        channelRef.current = channel;

      } catch (err) {
        if (mounted) {
          console.error('[useArenaChat] Initialization error:', err);
          setError(err instanceof Error ? err : new Error('Chat initialization failed'));
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeChat();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        // Add telemetry for unsubscribe
        import('@/lib/telemetry').then(({ ArenaEvents }) => {
          ArenaEvents.chatUnsubscribe(groupId);
        });
      }
    };
  }, [groupId]);

  // Rate limiting: 5 messages per 10 seconds
  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    
    // Reset counter every 10 seconds
    if (sendCountResetRef.current) {
      clearTimeout(sendCountResetRef.current);
    }
    sendCountResetRef.current = setTimeout(() => {
      sendCount.current = 0;
    }, 10000);

    sendCount.current += 1;
    
    if (sendCount.current > 5) {
      toast({
        title: "Slow down! 🚦",
        description: "Max 5 messages per 10 seconds. Give others a chance to chat!",
        variant: "destructive",
      });
      return false;
    }
    
    return true;
  }, [toast]);

  // 2-second debounce
  const checkDebounce = useCallback(() => {
    const now = Date.now();
    if (now - lastSendTime.current < 2000) {
      return false;
    }
    lastSendTime.current = now;
    return true;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmedText = text.trim();
    
    if (!trimmedText) {
      toast({
        title: "Empty message",
        description: "Please enter a message to send.",
        variant: "destructive",
      });
      return;
    }

    if (!groupId) {
      if (!hasWarnedRef.current) {
        console.warn('[useArenaChat] sendMessage called with no groupId');
        hasWarnedRef.current = true;
      }
      return;
    }

    // Check debounce
    if (!checkDebounce()) {
      toast({
        title: "Too fast! ⚡",
        description: "Please wait 2 seconds between messages.",
        variant: "destructive",
      });
      return;
    }

    // Check rate limit
    if (!checkRateLimit()) {
      return;
    }

    try {
      // Check hard disable flag before sending
      try {
        const { data: flagData } = await (supabase as any)
          .from('runtime_flags')
          .select('enabled')
          .eq('name', 'arena_v2_hard_disable')
          .maybeSingle();

        if (flagData?.enabled === true) {
          toast({
            title: "Arena is under maintenance",
            description: "Chat is temporarily disabled.",
            variant: "destructive",
          });
          return;
        }
      } catch (flagError) {
        // Ignore flag check errors, allow message to proceed
        console.debug('[useArenaChat] Flag check failed, proceeding:', flagError);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData?.session?.user?.id;

      if (!userId) {
        toast({
          title: "Authentication required",
          description: "Please log in to send messages.",
          variant: "destructive",
        });
        return;
      }

      console.debug('[useArenaChat] Sending message:', { groupId, userId, message: trimmedText });

      const { data, error } = await supabase
        .from('arena_chat_messages')
        .insert({
          group_id: groupId,
          user_id: userId,
          message: trimmedText,
        })
        .select()
        .single();

      if (error) {
        console.error('[useArenaChat] Send error:', error);
        
        // Add telemetry for send failures
        import('@/lib/telemetry').then(({ ArenaEvents }) => {
          ArenaEvents.chatSend(false, trimmedText.length, error.message);
        });
        
        // Handle RLS errors with friendly messages
        if (error.code === '42501' || error.message.includes('permission denied')) {
          toast({
            title: "Not a group member",
            description: "You need to be a member of this arena group to send messages.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Failed to send message",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
        }
        return;
      }

      console.debug('[useArenaChat] Message sent successfully:', data.id);
      
      // Add telemetry for successful sends
      import('@/lib/telemetry').then(({ ArenaEvents }) => {
        ArenaEvents.chatSend(true, trimmedText.length);
      });

    } catch (err) {
      console.error('[useArenaChat] Send message error:', err);
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    }
  }, [groupId, toast, checkDebounce, checkRateLimit]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sendCountResetRef.current) {
        clearTimeout(sendCountResetRef.current);
      }
    };
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    error,
  };
}