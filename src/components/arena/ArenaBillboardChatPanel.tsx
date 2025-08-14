import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, MessageSquare, Megaphone, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

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
  pending?: boolean;
  error?: boolean;
  clientId?: string;
}

interface ArenaBillboardChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ArenaBillboardChatPanel({ isOpen, onClose }: ArenaBillboardChatPanelProps) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isNotMember, setIsNotMember] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [session, setSession] = useState<any>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const chatChannelRef = useRef<any>(null);
  const announcementChannelRef = useRef<any>(null);
  const backfillTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const BOTTOM_THRESHOLD = 60; // px

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user);
      setSession(session);
    };
    checkAuth();
  }, []);

  // Load initial data and setup realtime when panel opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadInitialData();
      
      // Telemetry
      if (process.env.NODE_ENV !== 'production') {
        console.info('arena_billboard_opened');
      }
    } else if (!isOpen) {
      // Cleanup when panel closes
      cleanupRealtimeSubscriptions();
    }
  }, [isOpen, isAuthenticated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRealtimeSubscriptions();
    };
  }, []);

  // Realtime functions
  const cleanupRealtimeSubscriptions = useCallback(() => {
    if (chatChannelRef.current) {
      supabase.removeChannel(chatChannelRef.current);
      chatChannelRef.current = null;
    }
    if (announcementChannelRef.current) {
      supabase.removeChannel(announcementChannelRef.current);
      announcementChannelRef.current = null;
    }
    if (backfillTimerRef.current) {
      clearInterval(backfillTimerRef.current);
      backfillTimerRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  const setupRealtimeSubscriptions = useCallback((challengeId: string) => {
    if (!challengeId) return;
    
    // Setup chat channel
    const chatChannel = supabase
      .channel(`r20-chat-${challengeId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'rank20_chat_messages', 
          filter: `challenge_id=eq.${challengeId}` 
        },
        (payload) => {
          const row = payload.new as ChatMessage;
          onChatInsertFromRealtime(row);
          
          // Telemetry
          if (process.env.NODE_ENV !== 'production') {
            console.info('arena_realtime_message_received', { messageId: row.id });
          }
        }
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV !== 'production') {
          console.info('[RT] chat status', status);
        }
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          // Telemetry
          if (process.env.NODE_ENV !== 'production') {
            console.info('arena_realtime_subscribed', { kind: 'chat' });
          }
        } else if (status === 'CHANNEL_ERROR') {
          setConnectionStatus('reconnecting');
          // Telemetry
          if (process.env.NODE_ENV !== 'production') {
            console.info('arena_realtime_dropped', { reason: 'channel_error', kind: 'chat' });
          }
        }
      });

    chatChannelRef.current = chatChannel;

    // Setup announcement channel
    const announcementChannel = supabase
      .channel(`r20-ann-${challengeId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'rank20_billboard_messages', 
          filter: `challenge_id=eq.${challengeId}` 
        },
        (payload) => {
          const row = payload.new as Announcement;
          onAnnouncementInsertFromRealtime(row);
          
          // Telemetry
          if (process.env.NODE_ENV !== 'production') {
            console.info('arena_realtime_announcement_received', { announcementId: row.id });
          }
        }
      )
      .subscribe((status) => {
        if (process.env.NODE_ENV !== 'production') {
          console.info('[RT] announcement status', status);
        }
        
        if (status === 'SUBSCRIBED') {
          // Telemetry
          if (process.env.NODE_ENV !== 'production') {
            console.info('arena_realtime_subscribed', { kind: 'announcement' });
          }
        } else if (status === 'CHANNEL_ERROR') {
          // Telemetry
          if (process.env.NODE_ENV !== 'production') {
            console.info('arena_realtime_dropped', { reason: 'channel_error', kind: 'announcement' });
          }
        }
      });

    announcementChannelRef.current = announcementChannel;

    // Setup backfill timer
    backfillTimerRef.current = setInterval(() => {
      if (connectionStatus !== 'connected') {
        backfillMessages();
      }
    }, 45000); // 45 seconds
  }, [connectionStatus]);

  const onChatInsertFromRealtime = useCallback((row: ChatMessage) => {
    setChatMessages(prev => {
      // Try to find a pending temp match (same user, same body, within 3s)
      const match = prev.find(msg => 
        msg.pending && 
        msg.user_id === row.user_id && 
        msg.body === row.body &&
        Math.abs(new Date(msg.created_at).getTime() - new Date(row.created_at).getTime()) < 3000
      );
      
      if (match) {
        // Replace temp message with server row
        return prev.map(msg => 
          msg.id === match.id 
            ? { ...row, pending: false, error: false }
            : msg
        );
      } else {
        // Add new message if not duplicate and sort ASC
        const exists = prev.find(msg => msg.id === row.id);
        if (!exists) {
          const next = [...prev, { ...row, pending: false }];
          next.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          return next;
        }
        return prev;
      }
    });
  }, []);

  const onAnnouncementInsertFromRealtime = useCallback((row: Announcement) => {
    setAnnouncement(current => {
      // Only replace if this announcement is newer
      if (!current || new Date(row.created_at) > new Date(current.created_at)) {
        return row;
      }
      return current;
    });
  }, []);

  const backfillMessages = useCallback(async () => {
    try {
      const { data: recentData } = await supabase.rpc('my_rank20_chat_list', { 
        _limit: 10,
        _before_created_at: null,
        _before_id: null
      });
      
      if (recentData) {
        const reversedRecent = recentData.reverse();
        setChatMessages(prev => {
          const combined = [...prev];
          reversedRecent.forEach(msg => {
            if (!combined.find(existing => existing.id === msg.id)) {
              combined.push(msg);
            }
          });
          return combined;
        });
      }
    } catch (error) {
      console.error('Error during backfill:', error);
    }
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    setIsNotMember(false);
    
    try {
      // First check if user has rank20 challenge access
      const { data: challengeIdData, error: challengeError } = await supabase.rpc('my_rank20_challenge_id');
      if (challengeError || !challengeIdData) {
        console.info('User not in rank20 challenge');
        setIsNotMember(true);
        setIsLoading(false);
        return;
      }

      setChallengeId(challengeIdData);

      // Load latest announcement
      const { data: announcementData, error: announcementError } = await supabase.rpc('my_rank20_latest_announcement');
      if (announcementError) {
        console.error('Error loading announcement:', announcementError);
      } else {
        setAnnouncement(announcementData?.[0] || null);
      }

      // Load initial chat messages with improved pagination
      const { data: chatData, error: chatError } = await supabase.rpc('my_rank20_chat_list', { 
        _limit: 50,
        _before_created_at: null,
        _before_id: null
      });
      if (chatError) {
        console.error('Error loading chat:', chatError);
      } else {
        const reversedMessages = (chatData || []).reverse();
        setChatMessages(reversedMessages);
        setHasMore((chatData || []).length === 50);
      }

      // Setup realtime subscriptions
      setupRealtimeSubscriptions(challengeIdData);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOlderWithCursor = async (beforeCreatedAt: string, beforeId: string) => {
    if (loadingOlder) return;
    
    setLoadingOlder(true);
    const { data, error } = await supabase.rpc('my_rank20_chat_list', {
      _limit: 50,
      _before_created_at: beforeCreatedAt,
      _before_id: beforeId
    });
    setLoadingOlder(false);
    
    if (error) {
      console.error('Error loading older messages:', error);
      return;
    }

    // Keep scroll position stable after prepending
    const el = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    const prevScrollHeight = el?.scrollHeight ?? 0;

    setChatMessages(prev => {
      const merged = [...(data || []).reverse(), ...prev]; // data comes DESC; reverse to ASC
      // Dedupe by id
      const seen = new Set<string>();
      return merged.filter(m => (seen.has(m.id) ? false : (seen.add(m.id), true)));
    });

    setHasMore((data || []).length === 50);

    // Maintain viewport position
    requestAnimationFrame(() => {
      if (!el) return;
      const diff = el.scrollHeight - prevScrollHeight;
      el.scrollTop = (el.scrollTop ?? 0) + diff;
    });
  };

  const retryMessage = useCallback(async (messageId: string) => {
    const message = chatMessages.find(msg => msg.id === messageId);
    if (!message || !message.body) return;

    // Mark as pending
    setChatMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, pending: true, error: false }
          : msg
      )
    );

    try {
      const { error } = await supabase.rpc('my_rank20_chat_post', { _body: message.body });
      
      if (error) {
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === messageId 
              ? { ...msg, pending: false, error: true }
              : msg
          )
        );
        toast.error('Failed to retry message');
      }
      // Success will be handled by realtime insert
    } catch (error) {
      setChatMessages(prev => 
        prev.map(msg => 
          msg.id === messageId 
            ? { ...msg, pending: false, error: true }
            : msg
        )
      );
      toast.error('Failed to retry message');
    }
  }, [chatMessages]);

  const sendMessage = async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || isSending || !session?.user) return;

    // Client-side length validation (2000 chars max)
    if (trimmedMessage.length > 2000) {
      toast.error('Message too long (max 2000 characters)');
      return;
    }

    setIsSending(true);
    
    // Optimistic update - add temp message immediately
    const clientId = crypto.randomUUID();
    const tempMessage: ChatMessage = {
      id: clientId,
      user_id: session.user.id,
      body: trimmedMessage,
      created_at: new Date().toISOString(),
      pending: true,
      clientId
    };

    setChatMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    // Telemetry
    if (process.env.NODE_ENV !== 'production') {
      console.info('arena_chat_optimistic_sent', { length: trimmedMessage.length });
    }

    try {
      const { error } = await supabase.rpc('my_rank20_chat_post', { _body: trimmedMessage });
      
      if (error) {
        console.error('Error sending message:', error);
        
        // Mark message as error for retry
        setChatMessages(prev => 
          prev.map(msg => 
            msg.id === clientId 
              ? { ...msg, pending: false, error: true }
              : msg
          )
        );
        
        toast.error('Failed to send message');
        
        // Telemetry
        if (process.env.NODE_ENV !== 'production') {
          console.info('arena_chat_optimistic_fail', { error: error.message });
        }
        
        return;
      }

      // Telemetry
      if (process.env.NODE_ENV !== 'production') {
        console.info('arena_chat_message_sent', { length: trimmedMessage.length });
      }

      // Success - realtime will handle replacing the temp message
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark message as error for retry
      setChatMessages(prev => 
        prev.map(msg => 
          msg.id === clientId 
            ? { ...msg, pending: false, error: true }
            : msg
        )
      );
      
      toast.error('Failed to send message');
      
      // Telemetry
      if (process.env.NODE_ENV !== 'production') {
        console.info('arena_chat_optimistic_fail', { error: 'network_error' });
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleScroll = () => {
    const el = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!el) return;
    
    // Check if near bottom
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
    setAtBottom(nearBottom);
    
    // Load older when near top
    if (el.scrollTop <= 24 && !loadingOlder && chatMessages.length > 0) {
      const oldestMsg = chatMessages[0];
      if (oldestMsg) {
        loadOlderWithCursor(oldestMsg.created_at, oldestMsg.id);
      }
    }
  };

  const scrollToBottom = (smooth = true) => {
    const el = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  };

  // Auto-scroll when appropriate
  useEffect(() => {
    scrollToBottom(false);
  }, []);

  useEffect(() => {
    if (atBottom) {
      scrollToBottom(true);
    }
  }, [chatMessages.length, atBottom]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle non-member state
  if (isNotMember) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Billboard & Chat
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Not in this Arena</h3>
            <p className="text-muted-foreground">Join a Rank-of-20 group to see announcements and chat.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!isAuthenticated) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Billboard & Chat
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Sign in to participate in the Billboard & Chat.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Billboard & Chat
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Announcement Section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="h-4 w-4" />
                Latest Announcement
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ) : announcement ? (
                <div>
                  {announcement.title && (
                    <h4 className="font-medium mb-2">{announcement.title}</h4>
                  )}
                  <p className="text-sm text-muted-foreground mb-2">{announcement.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No announcements yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Chat Section */}
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>Group Chat</span>
                {connectionStatus === 'reconnecting' && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <WifiOff className="h-3 w-3" />
                    Reconnecting...
                  </div>
                )}
                {connectionStatus === 'connected' && challengeId && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Wifi className="h-3 w-3" />
                    Live
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 space-y-3">
              {/* Messages */}
              <div
                ref={scrollAreaRef}
                onScroll={handleScroll}
                className="h-[420px] max-h-[55vh] overflow-y-auto pr-2 space-y-3"
              >
                {loadingOlder && (
                  <div className="text-center py-2">
                    <span className="text-xs text-muted-foreground">Loading older messages...</span>
                  </div>
                )}
                
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-muted rounded w-1/4 mb-1"></div>
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                ) : chatMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-8">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  chatMessages.map((message) => (
                    <div key={message.id} className={`space-y-1 ${message.pending ? 'opacity-60' : ''} ${message.error ? 'border-l-2 border-red-500 pl-2' : ''}`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          User {message.user_id.slice(-6)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                        {message.pending && (
                          <span className="text-xs text-blue-500">Sending...</span>
                        )}
                        {message.error && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => retryMessage(message.id)}
                            className="h-4 px-2 text-xs text-red-500 hover:text-red-700"
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                      <p className={`text-sm ${message.error ? 'text-red-700' : ''}`}>
                        {message.body}
                        {message.error && <span className="text-xs text-red-500 ml-2">(Failed to send)</span>}
                      </p>
                    </div>
                  ))
                )}
                <div ref={bottomAnchorRef} />
              </div>

              {/* Send Message */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message... (max 2000 chars)"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isSending}
                    className="flex-1"
                    maxLength={2000}
                  />
                  <Button 
                    onClick={sendMessage} 
                    disabled={isSending || newMessage.trim().length > 2000}
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {newMessage.length > 1800 && (
                  <div className="text-xs text-muted-foreground text-right">
                    {newMessage.length}/2000 characters
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}