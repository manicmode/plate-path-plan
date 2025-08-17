import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, MessageSquare, Megaphone, Wifi, WifiOff, Smile, MoreHorizontal, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { useFriendStatuses } from '@/hooks/useFriendStatuses';
import { useFriendActions } from '@/hooks/useFriendActions';
import { FriendCTA } from '@/components/social/FriendCTA';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useFriendRealtime } from '@/hooks/useFriendRealtime';
import { useArenaActive, useArenaMembers } from '@/hooks/useArena';
import { useArenaChat } from '@/hooks/useArenaChat';
import { supabase } from '@/integrations/supabase/client';

interface Announcement {
  id: string;
  title: string | null;
  body: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  user_id: string;
  message: string; // V2 uses 'message' instead of 'body'
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
  
  // V2 Arena hooks
  const { groupId, isLoading: loadingGroupId } = useArenaActive();
  const { members } = useArenaMembers(groupId);
  const { messages, sendMessage, isLoading: chatLoading } = useArenaChat(groupId);
  
  // Local state
  const [newMessage, setNewMessage] = useState('');
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

  // Friend status management with realtime updates
  useFriendRealtime({
    onUserIdsChanged: (userIds) => {
      // Refresh statuses for affected users if they're in our messages
      const affectedIds = userIds.filter(id => chatUserIds.includes(id));
      if (affectedIds.length > 0) {
        // Force a re-render of the friend statuses
        setNewMessage(prev => prev); // Trigger a state update to refresh
      }
    },
    enabled: friendCtasEnabled
  });

  // Friend status management
  const chatUserIds = useMemo(() => {
    const uniqueUserIds = [...new Set(messages.map(msg => msg.user_id))];
    return uniqueUserIds;
  }, [messages]);

  // Build user display map from members
  const userDisplayMap = useMemo(() => {
    const map = new Map<string, { display_name: string; avatar_url?: string }>();
    members.forEach(member => {
      map.set(member.user_id, {
        display_name: member.display_name,
        avatar_url: member.avatar_url,
      });
    });
    return map;
  }, [members]);

  const { statusMap, loading: friendStatusLoading } = useFriendStatuses(chatUserIds);
  const { sendFriendRequest, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, isPending, isOnCooldown } = useFriendActions({
    onStatusUpdate: (userId, relation, requestId) => {
      // Status updates are handled by the useFriendStatuses hook
    }
  });

  // Authentication check
  useEffect(() => {
    if (!isOpen) return;
    
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session?.user?.id);
        console.debug('[ArenaBillboardChatPanel] Auth status:', !!session?.user?.id);
      } catch (error) {
        console.error('[Arena chat auth check]', error);
        setIsAuthenticated(false);
      }
    })();
  }, [isOpen]);

  // Handle send message using V2 chat hook
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !isAuthenticated || !sendMessage) return;

    try {
      await sendMessage(newMessage);
      setNewMessage('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (error) {
      // Error handling is done in the useArenaChat hook
      console.debug('[ArenaBillboardChatPanel] Send message handled by hook');
    }
  }, [newMessage, isAuthenticated, sendMessage]);

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
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

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
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet. Say hi to your group 👋</p>
                </div>
              ) : (
                messages.map((message) => {
                  const userDisplay = userDisplayMap.get(message.user_id);
                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium text-primary">
                          {userDisplay?.display_name?.slice(0, 2) || message.user_id.slice(0, 2)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium truncate">
                              {userDisplay?.display_name || `User ${message.user_id.slice(0, 8)}`}
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
                                 onCancelRequest={cancelFriendRequest}
                                 isPending={isPending(message.user_id)}
                                 isOnCooldown={isOnCooldown(message.user_id)}
                                 isLoading={friendStatusLoading}
                               />
                             </div>
                          )}
                        </div>
                        <p className="text-sm break-words">{message.message}</p>
                      </div>
                    </motion.div>
                  )
                })
              )}
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
                disabled={!isAuthenticated}
                data-testid="arena-chat-input"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!newMessage.trim() || !isAuthenticated}
                size="icon"
                data-testid="arena-chat-send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}