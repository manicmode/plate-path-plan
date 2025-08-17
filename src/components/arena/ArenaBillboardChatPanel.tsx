import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { withArenaSession } from '@/hooks/useArenaSession';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, MessageSquare, Megaphone, Wifi, WifiOff, Smile, MoreHorizontal, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { useFriendStatuses } from '@/hooks/useFriendStatuses';
import { useFriendActions } from '@/hooks/useFriendActions';
import { FriendCTA } from '@/components/social/FriendCTA';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

interface Announcement {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  display_name?: string | null;
  avatar_url?: string | null;
  pending?: boolean;
  error?: boolean;
  clientId?: string;
}

interface ArenaBillboardChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  privateChallengeId?: string | null;
}

export default function ArenaBillboardChatPanel({ isOpen, onClose, privateChallengeId }: ArenaBillboardChatPanelProps) {
  const { toast } = useToast();
  
  // State management
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [session, setSession] = useState<any>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // UI state
  const [showEmojiStrip, setShowEmojiStrip] = useState(() => {
    return localStorage.getItem('arena-emoji-strip-visible') !== 'false';
  });
  const [emojiTapCount, setEmojiTapCount] = useState(0);
  const [emojiTapResetTimer, setEmojiTapResetTimer] = useState<NodeJS.Timeout | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const chatChannelRef = useRef<any>(null);
  const announcementChannelRef = useRef<any>(null);
  const backfillTimerRef = useRef<NodeJS.Timeout | null>(null);
  const userCache = useRef(new Map<string, {display_name?: string|null; avatar_url?: string|null}>());
  const visibleMessageIdsRef = useRef<Set<string>>(new Set());
  
  // Constants
  const BOTTOM_THRESHOLD = 60;
  
  // Reactions state
  type ReactionCount = { message_id: string; emoji: string; count: number };
  const [reactions, setReactions] = useState<Record<string, Record<string, number>>>({});
  
  // RPC logging utility
  const logRpc = useCallback((name: string, err: any) => {
    console.error('[RPC]', name, { 
      code: err?.code, 
      message: err?.message, 
      details: err?.details, 
      hint: err?.hint 
    });
  }, []);

  // Feature flag for friend CTAs
  const { enabled: friendCtasEnabled } = useFeatureFlag('friend_ctas');

  // Friend status management
  const chatUserIds = useMemo(() => {
    const uniqueUserIds = [...new Set(chatMessages.map(msg => msg.user_id))];
    return uniqueUserIds;
  }, [chatMessages]);

  const { statusMap, loading: friendStatusLoading } = useFriendStatuses(chatUserIds);
  const { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, isPending, isOnCooldown } = useFriendActions({
    onStatusUpdate: (userId, relation, requestId) => {
      // Status updates are handled by the useFriendStatuses hook
    }
  });

  // Arena initialization with proper session guard
  useEffect(() => {
    if (!isOpen) return;
    
    let cancelled = false;
    
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          setIsAuthenticated(false);
          return;
        }
        
        setSession(session);
        setIsAuthenticated(true);

        // Ensure membership
        const m = await supabase.rpc('ensure_rank20_membership');
        if (m.error) { 
          logRpc('ensure_rank20_membership', m.error); 
          return; 
        }

        // Get challenge ID
        const cid = await supabase.rpc('my_rank20_chosen_challenge_id');
        if (cid.error) { 
          logRpc('my_rank20_chosen_challenge_id', cid.error); 
          return; 
        }
        
        const resolvedChallengeId = cid.data;
        if (!resolvedChallengeId || cancelled) return;
        
        setChallengeId(resolvedChallengeId);

        // Initial message fetch
        const { data: messages, error: messagesError } = await supabase
          .from('rank20_chat_messages')
          .select('id, body, user_id, created_at')
          .eq('challenge_id', resolvedChallengeId)
          .order('created_at', { ascending: true });
          
        if (messagesError) {
          logRpc('select rank20_chat_messages', messagesError);
        } else {
          setChatMessages(messages ?? []);
        }

        // Set up realtime subscription
        const ch = supabase.channel(`rank20-chat:${resolvedChallengeId}`)
          .on('postgres_changes', {
            event: '*', 
            schema: 'public', 
            table: 'rank20_chat_messages',
            filter: `challenge_id=eq.${resolvedChallengeId}`
          }, payload => {
            setChatMessages(prev => {
              // Minimal de-dupe by id
              const next = [...prev.filter(m => m.id !== (payload.new as any)?.id)];
              if (payload.eventType !== 'DELETE') {
                next.push(payload.new as any);
              }
              return next.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
          })
          .subscribe(status => {
            if (status === 'SUBSCRIBED') {
              setConnectionStatus('connected');
            } else if (status === 'CLOSED') {
              setConnectionStatus('disconnected');
            }
          });

        chatChannelRef.current = ch;

        return () => { 
          cancelled = true; 
          if (ch) supabase.removeChannel(ch); 
        };
        
      } catch (error) {
        console.error('[Arena init]', error);
        setIsAuthenticated(false);
      }
    })();
    
    return () => {
      cancelled = true;
      if (chatChannelRef.current) {
        supabase.removeChannel(chatChannelRef.current);
        chatChannelRef.current = null;
      }
    };
  }, [isOpen, logRpc]);

  // Send message function with session guard
  const sendMessage = useCallback(async (text: string) => {
    const body = text.trim();
    if (!body) return;

    try {
      const { data, error } = await supabase.rpc('arena_post_message', { p_content: body });
      if (error) { 
        logRpc('arena_post_message', error); 
        throw error; 
      }
      return data as string; // uuid
    } catch (error) {
      console.error('[sendMessage]', error);
      throw error;
    }
  }, [logRpc]);

  // Handle send message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || isSending || !isAuthenticated) return;

    setIsSending(true);
    try {
      await sendMessage(newMessage);
      setNewMessage('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  }, [newMessage, isSending, isAuthenticated, sendMessage, toast]);

  // Scroll to bottom
  const scrollToBottom = useCallback((force = false) => {
    if (!force && !atBottom) return;
    
    requestAnimationFrame(() => {
      if (bottomAnchorRef.current) {
        bottomAnchorRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }
    });
  }, [atBottom]);

  // Auto-scroll for new messages
  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages, scrollToBottom]);

  // Render loading state
  if (!isAuthenticated) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl h-[600px] p-0 overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Connecting to Arena...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl h-[600px] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Arena Chat
            <div className="flex items-center gap-1 ml-auto">
              {connectionStatus === 'connected' ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : connectionStatus === 'reconnecting' ? (
                <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground capitalize">
                {connectionStatus}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col h-full">
          {/* Chat Messages */}
          <ScrollArea 
            ref={scrollAreaRef}
            className="flex-1 px-6"
          >
            <div className="space-y-4 py-4">
              {chatMessages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-primary">
                      {message.display_name?.slice(0, 2) || message.user_id.slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {message.display_name || `User ${message.user_id.slice(0, 8)}`}
                        </span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {friendCtasEnabled && (
                        <div className="flex-shrink-0 ml-2">
                          <FriendCTA
                            userId={message.user_id}
                            relation={statusMap.get(message.user_id)?.relation || 'none'}
                            requestId={statusMap.get(message.user_id)?.requestId}
                            variant="icon"
                            onSendRequest={sendFriendRequest}
                            onAcceptRequest={acceptFriendRequest}
                            onRejectRequest={rejectFriendRequest}
                            isPending={isPending(message.user_id)}
                            isOnCooldown={isOnCooldown(message.user_id)}
                            isLoading={friendStatusLoading}
                          />
                        </div>
                      )}
                    </div>
                    <p className="text-sm break-words">{message.body}</p>
                  </div>
                </motion.div>
              ))}
              <div ref={bottomAnchorRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-6 pt-0">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isSending || !isAuthenticated}
                data-testid="arena-chat-input"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!newMessage.trim() || isSending || !isAuthenticated}
                size="icon"
                data-testid="arena-chat-send"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}